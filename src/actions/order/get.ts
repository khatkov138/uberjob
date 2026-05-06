"use server"

import { FeedContext } from "@/app/(public)/orders/[[...slug]]/page"
import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"
import { delay } from "@/lib/utils"

import { Category, Location, Order, OrderCategory, OrderStatus, Prisma, User } from "@prisma/client"


interface RawSQL extends Order {
  distance: number | null;
  total_p: number;
  comp_p: number;
  off_c: number;
  loc_name: string | null;
  loc_slug: string | null;
  is_match_sql: boolean; // Флаг из БД
}

type FullOrderCategory = OrderCategory & {
  category: Pick<Category, "id" | "name" | "slug">;
};

// Вспомогательный тип для пакетной загрузки клиентов
type SimpleClient = Pick<User, "id" | "name" | "image">;

export async function getOrders<T extends 'list' | 'map'>(params: FeedContext & {
  cursor?: string | null;
  limit?: number;
  mode: T;
}) {
  return createAction<GetOrdersResponse<T>>(async () => {
    const {
      lat, lng, radius, categoryId,
      skillIds = [],
      cursor,
      limit = 20,
      mode
    } = params;

    const isList = mode === 'list';

    // 1. Динамические условия (SQL)
    const categoryCondition = categoryId
      ? Prisma.sql`EXISTS (SELECT 1 FROM "order_category" oc WHERE oc."orderId" = o.id AND oc."categoryId" = ${categoryId})`
      : skillIds.length > 0
        ? Prisma.sql`EXISTS (SELECT 1 FROM "order_category" oc WHERE oc."orderId" = o.id AND oc."categoryId" = ANY(${skillIds}))`
        : Prisma.sql`TRUE`;

    const cursorCondition = (isList && cursor)
      ? (() => {
        const [cDate, cId] = cursor.split('|');
        return Prisma.sql`(o."createdAt", o.id) < (${cDate}::timestamp, ${cId})`;
      })()
      : Prisma.sql`TRUE`;

    const distFormula = Prisma.sql`(6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat))))`;

    // 2. Основные запросы
    const [raw, countResult] = await Promise.all([
      prisma.$queryRaw<RawSQL[]>`
        SELECT 
          o.id, o.lat, o.lng, o.price, o."createdAt", o.status, o."clientId", o."locationId",
          -- Считаем совпадение скиллов прямо в базе для обоих режимов
          EXISTS (
            SELECT 1 FROM "order_category" oc 
            WHERE oc."orderId" = o.id AND oc."categoryId" = ANY(${skillIds})
          ) as is_match_sql
          ${isList ? Prisma.sql`, 
            o.title, l.name as loc_name, l.slug as loc_slug, ${distFormula} AS distance,
            (SELECT COUNT(*)::int FROM "order" WHERE "clientId" = o."clientId") as total_p,
            (SELECT COUNT(*)::int FROM "order" WHERE "clientId" = o."clientId" AND "status" = 'COMPLETED') as comp_p,
            (SELECT COUNT(*)::int FROM "offer" WHERE "orderId" = o.id) as off_c
          ` : Prisma.empty}
        FROM "order" o
        ${isList ? Prisma.sql`LEFT JOIN "location" l ON l.id = o."locationId"` : Prisma.empty}
        WHERE o.status = 'PENDING'
          AND ${distFormula} <= ${radius}
          AND ${categoryCondition}
          AND ${cursorCondition}
        ORDER BY o."createdAt" DESC, o.id DESC 
        LIMIT ${isList ? limit : 1000}
      `,
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int as count 
        FROM "order" o 
        WHERE o.status = 'PENDING' 
          AND ${distFormula} <= ${radius} 
          AND ${categoryCondition}
      `
    ]);

    const total = Number(countResult[0]?.count || 0);
    if (!raw.length) return { orders: [], nextCursor: null, total } as unknown as GetOrdersResponse<T>;

    // 3. Пакетная загрузка (только для списка)
    let categories: FullOrderCategory[] = [];
    let clients: SimpleClient[] = [];

    if (isList) {
      const orderIds = raw.map(o => o.id);
      [categories, clients] = await Promise.all([
        prisma.orderCategory.findMany({
          where: { orderId: { in: orderIds } },
          include: { category: { select: { id: true, name: true, slug: true } } }
        }) as unknown as Promise<FullOrderCategory[]>,
        prisma.user.findMany({
          where: { id: { in: raw.map(o => o.clientId) } },
          select: { id: true, name: true, image: true }
        })
      ]);
    }

    // 4. Маппинг
    const orders = raw.map((o) => {
      const base = {
        id: o.id,
        lat: o.lat,
        lng: o.lng,
        price: Number(o.price),
        status: o.status,
        createdAt: o.createdAt,
        clientId: o.clientId,
        locationId: o.locationId,
        distance: o.distance ? Math.round(Number(o.distance) * 10) / 10 : null,
        isMatch: !!o.is_match_sql, // Берем флаг из SQL
        offersCount: Number(o.off_c || 0),
      };

      if (!isList) return base;

      const orderCategories = categories.filter(c => c.orderId === o.id);

      return {
        ...base,
        title: o.title,
        location: o.loc_name ? { name: o.loc_name, slug: o.loc_slug || "" } : null,
        client: clients.find(c => c.id === o.clientId) || null,
        clientStats: {
          projects: Number(o.total_p || 0),
          hireRate: o.total_p > 0 ? Math.round((o.comp_p / o.total_p) * 100) : 0
        },
        categories: orderCategories.map(c => ({
          categoryId: c.categoryId,
          category: c.category
        }))
      };
    });

    const nextCursor = (isList && orders.length === limit)
      ? `${raw[raw.length - 1].createdAt.toISOString()}|${raw[raw.length - 1].id}`
      : null;

    return {
      orders: orders as GetOrdersResponse<T>['orders'],
      nextCursor,
      total
    };
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

export type BaseOrder = Omit<Order, "price"> & {
  price: number;
  distance: number | null;
  isMatch: boolean;
  offersCount: number;
};

// Полный тип для списка (все поля ОБЯЗАТЕЛЬНЫ)
export type FeedOrder = BaseOrder & {
  location: Pick<Location, "name" | "slug"> | null;
  client: {
    name: string | null;
    image: string | null;
  } | null;
  categories: {
    categoryId: string;
    category: Pick<Category, "id" | "name" | "slug">;
  }[];
  clientStats: {
    projects: number;
    hireRate: number;
  };
};

// Ответ экшена теперь зависит от переданного Generic типа
export type GetOrdersResponse<T extends 'list' | 'map' = 'list'> = {
  orders: T extends 'list' ? FeedOrder[] : BaseOrder[];
  nextCursor: string | null;
  total: number;
};

export type ClientOrder = InferActionResult<typeof getClientOrders>
export type OrderByIdOrSlugResponse = InferActionResult<typeof getOrderByIdOrSlug>


