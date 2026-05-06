"use server"

import { FeedContext } from "@/app/(public)/orders/[[...slug]]/page"
import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"

import { Category, Location, Order, OrderStatus, Prisma } from "@prisma/client"


interface RawSQL extends Order {
  distance: number | null
  total_p: number
  comp_p: number
  off_c: number
  loc_name: string | null
  loc_slug: string | null
}

export async function getOrders(params: FeedContext & {
  page?: number;
  limit?: number;
  skillIds?: string[]
}) {
  return createAction<FeedOrder[]>(async () => {
    const {
      lat, lng, radius, categoryId,
      skillIds = [],
      page = 0,
      limit = 15
    } = params;

    const distSql = Prisma.raw(`
      (6371 * acos(
        cos(radians(${lat})) * cos(radians(o.lat)) * 
        cos(radians(o.lng) - radians(${lng})) + 
        sin(radians(${lat})) * sin(radians(o.lat))
      ))
    `);

    // Генерируем условие фильтрации динамически
    let categoryCondition = Prisma.raw('TRUE'); // По умолчанию показываем всё

    if (categoryId) {
      // Если есть категория в URL — фильтруем строго по ней
      categoryCondition = Prisma.raw(`EXISTS (
        SELECT 1 FROM "order_category" oc 
        WHERE oc."orderId" = o.id AND oc."categoryId" = '${categoryId}'
      )`);
    } else if (skillIds.length > 0) {
      // Если категории в URL нет, но есть навыки — фильтруем по массиву навыков
      categoryCondition = Prisma.raw(`EXISTS (
        SELECT 1 FROM "order_category" oc 
        WHERE oc."orderId" = o.id 
        AND oc."categoryId" = ANY(ARRAY[${skillIds.map(id => `'${id}'`).join(',')}]::text[])
      )`);
    }

    const raw = await prisma.$queryRaw<RawSQL[]>`
      SELECT 
        o.*, 
        l.name as loc_name, 
        l.slug as loc_slug, 
        ${distSql} AS distance,
        (SELECT COUNT(*)::int FROM "order" WHERE "clientId" = o."clientId") as total_p,
        (SELECT COUNT(*)::int FROM "order" WHERE "clientId" = o."clientId" AND "status" = 'COMPLETED') as comp_p,
        (SELECT COUNT(*)::int FROM "offer" WHERE "orderId" = o.id) as off_c
      FROM "order" o
      LEFT JOIN "location" l ON l.id = o."locationId"
      WHERE o.status = 'PENDING'
        AND ${distSql} <= ${radius}
        AND ${categoryCondition}
      ORDER BY o."createdAt" DESC 
      LIMIT ${limit}
      OFFSET ${page * limit}
    `;

    if (!raw.length) return [];

    // ... (пакетная загрузка категорий и клиентов как была раньше) ...
    const ids = raw.map(o => o.id);
    const [categories, clients] = await Promise.all([
      prisma.orderCategory.findMany({
        where: { orderId: { in: ids } },
        include: { category: true }
      }),
      prisma.user.findMany({
        where: { id: { in: raw.map(o => o.clientId) } },
        select: { id: true, name: true, image: true }
      })
    ]);

    return raw.map((o): FeedOrder => {
      const orderCatIds = categories.filter(c => c.orderId === o.id).map(c => c.categoryId);
      // isMatch теперь просто проверяет пересечение с массивом skillIds
      const isMatch = skillIds.length > 0 && orderCatIds.some(id => skillIds.includes(id));

      return {
        ...o,
        price: Number(o.price),
        distance: o.distance ? Math.round(o.distance * 10) / 10 : null,
        isMatch,
        offersCount: Number(o.off_c),
        location: o.loc_name ? { name: o.loc_name, slug: o.loc_slug || "" } : null,
        client: clients.find(c => c.id === o.clientId) || null,
        clientStats: {
          projects: Number(o.total_p),
          hireRate: o.total_p > 0 ? Math.round((o.comp_p / o.total_p) * 100) : 0
        },
        categories: categories
          .filter(c => c.orderId === o.id)
          .map(c => ({
            categoryId: c.categoryId,
            category: { id: c.category.id, name: c.category.name, slug: c.category.slug }
          }))
      };
    });
  });
}


export async function getClientOrders() {
  return createAuthAction(async (userId) => {
    return await prisma.order.findMany({
      where: { clientId: userId },
      include: {
        offers: {
          include: { worker: { select: { name: true, image: true, profile: { select: { rating: true } } } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  })
}


export async function getActiveOrdersCount(role: 'CLIENT' | 'WORKER') {
  return createAuthAction(async (userId) => {
    // Для Клиента активные — это те, что еще не завершены и не отменены
    // Для Воркера активные — это те, где он уже утвержден и работает
    const where = role === 'CLIENT'
      ? {
        clientId: userId,
        status: {
          notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED]
        }
      }
      : {
        workerId: userId,
        status: OrderStatus.IN_PROGRESS
      }

    return await prisma.order.count({
      where
    })
  })
}



export async function getOrderByIdOrSlug(identifier: string) {
  return createAction(async () => {
    const session = await getServerSession()
    const userId = session?.user?.id || null

    // Определяем, по какому полю искать
    // Если строка начинается на 'c' и она достаточно длинная — скорее всего это CUID (ID)
    const isId = identifier.startsWith('c') && identifier.length > 20;
    const where = isId ? { id: identifier } : { slug: identifier };

    const order = await prisma.order.findUnique({
      where,
      include: {
        client: {
          select: {
            name: true,
            image: true,
            createdAt: true,
            _count: { select: { ordersCreated: true } }
          }
        },
        categories: { include: { category: true } },
        location: { select: { name: true, slug: true } }, // Добавляем локацию для деталей
        _count: { select: { offers: true } },
        offers: {
          where: {
            order: { clientId: userId || "guest_access" }
          },
          include: {
            worker: { select: { name: true, image: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!order) throw new Error("Not found");

    const existingOffer = userId
      ? await prisma.offer.findFirst({ where: { orderId: order.id, workerId: userId } })
      : null

    return {
      order,
      existingOffer: !!existingOffer,
      userId
    }
  })
}


export async function getLatestPublicOrders() {
  return createAction(async () => {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,

        location: {
          select: {
            name: true,
            slug: true
          }
        },
        lat: true, // Координаты оставляем, они нужны для карты
        lng: true,
        categories: {
          include: {
            category: true
          }
        },
        createdAt: true,
        client: {
          select: {
            name: true
          }
        }
      },
    });

    return orders;
  });
}

export type FeedOrder = Omit<Order, "price"> & {
  price: number
  distance: number | null
  // isMatch мы вычисляем на клиенте или передаем отдельно, 
  // но в объекте заказа он тоже может быть
  isMatch: boolean
  offersCount: number

  // Данные о локации (для вывода города/района)
  location: Pick<Location, "name" | "slug"> | null

  // Объект клиента из связи userId -> User
  client: {
    name: string | null
    image: string | null
  } | null

  // Связь OrderCategory -> Category
  categories: {
    categoryId: string
    category: Pick<Category, "id" | "name" | "slug">
  }[]

  // Статистика клиента (вычисляемые поля)
  clientStats: {
    projects: number
    hireRate: number
  }
}

export type ClientOrder = InferActionResult<typeof getClientOrders>
export type OrderByIdOrSlugResponse = InferActionResult<typeof getOrderByIdOrSlug>


