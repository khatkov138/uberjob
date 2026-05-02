"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"
import { delay, getDistance } from "@/lib/utils"
import { Category, Order, OrderStatus, Prisma } from "@prisma/client"

// ЛЕНТА (Исполнитель)

// Интерфейс для сырого ответа (SQL возвращает числа как bigint)
interface RawOrderQueryResult extends Omit<Order, "price"> {
  price: bigint
  distance: number | null
  is_match: boolean | number
  total_p: bigint
  comp_p: bigint
  off_c: bigint
}

export async function getOrders({ 
  lat, 
  lng, 
  radius = 60,
  categoryId, // Добавляем для SEO-фильтрации (опционально)
  locationId  // Добавляем для быстрой фильтрации по городу (опционально)
}: { 
  lat?: number, 
  lng?: number, 
  radius?: number,
  categoryId?: string,
  locationId?: string
}) {
  return createAction<FeedOrder[]>(async () => {
    const session = await getServerSession()
    const userId = session?.user?.id

    if (!lat || !lng) return []

    // 1. Получаем скиллы мастера для is_match
    let skillIds: string[] = []
    if (userId) {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { skills: { select: { categoryId: true } } }
      })
      skillIds = profile?.skills.map(s => s.categoryId) || []
    }

    const hasSkills = skillIds.length > 0

    // 2. SQL Запрос
    // Добавляем фильтр по locationId для ускорения (если передан)
    // Добавляем фильтр по categoryId через JOIN (если передан)
    const raw = await prisma.$queryRaw<RawOrderQueryResult[]>`
      SELECT o.*,
        (6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat)))) AS distance,
        (SELECT COUNT(*) FROM "order" WHERE "clientId" = o."clientId") as total_p,
        (SELECT COUNT(*) FROM "order" WHERE "clientId" = o."clientId" AND "status" = 'COMPLETED') as comp_p,
        (SELECT COUNT(*) FROM "offer" WHERE "orderId" = o.id) as off_c,
        ${hasSkills 
          ? Prisma.raw(`EXISTS (
              SELECT 1 FROM "order_category" oc 
              WHERE oc."orderId" = o.id AND oc."categoryId" IN (${skillIds.map(id => `'${id}'`).join(',')})
            )`)
          : Prisma.raw(`false`)
        } as is_match
      FROM "order" o
      ${categoryId ? Prisma.raw(`JOIN "order_category" filter_oc ON filter_oc."orderId" = o.id`) : Prisma.raw('')}
      WHERE o.status = 'PENDING'
      ${locationId ? Prisma.raw(`AND o."locationId" = '${locationId}'`) : Prisma.raw('')}
      ${categoryId ? Prisma.raw(`AND filter_oc."categoryId" = '${categoryId}'`) : Prisma.raw('')}
      AND (6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat)))) <= ${radius}
      ORDER BY is_match DESC, o."createdAt" DESC
    `

    if (!raw.length) return []

    // 3. Загружаем связанных клиентов и категории
    const clientIds = [...new Set(raw.map(o => o.clientId))]
    const [categories, clients] = await Promise.all([
      prisma.orderCategory.findMany({
        where: { orderId: { in: raw.map(o => o.id) } },
        include: { category: { select: { name: true } } }
      }),
      prisma.user.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true, image: true }
      })
    ])

    // 4. Маппинг и очистка от BigInt
    return raw.map((o): FeedOrder => {
      const client = clients.find(c => c.id === o.clientId);
      const total = Number(o.total_p);
      const completed = Number(o.comp_p);
      
      // Вытягиваем BigInt и служебные поля, чтобы они не попали в серилизацию через ...orderFields
      const { total_p, comp_p, off_c, is_match, price, ...orderFields } = o;

      return {
        ...orderFields,
        price: Number(price),
        distance: o.distance ? Math.round(Number(o.distance) * 10) / 10 : null,
        isMatch: Boolean(is_match),
        offersCount: Number(off_c),
        client: client ? { name: client.name, image: client.image } : null,
        clientStats: {
          projects: total,
          hireRate: total > 0 ? Math.round((completed / total) * 100) : 0
        },
        categories: categories
          .filter(cat => cat.orderId === o.id)
          .map(cat => ({
            categoryId: cat.categoryId,
            category: { name: cat.category.name }
          }))
      };
    });
  })
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



export async function getOrderById(id: string) {
  return createAction(async () => {
    const session = await getServerSession()
    const userId = session?.user?.id || null

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, image: true, createdAt: true, _count: { select: { ordersCreated: true } } } },
        categories: { include: { category: true } },
        _count: { select: { offers: true } },
        // Магия: подгружаем отклики только если это владелец
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

    if (!order) throw new Error("Заказ не найден")

    const existingOffer = userId
      ? await prisma.offer.findFirst({ where: { orderId: id, workerId: userId } })
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
  isMatch: boolean
  offersCount: number
  // ДОБАВЛЯЕМ ОБЪЕКТ КЛИЕНТА
  client: {
    name: string | null
    image: string | null
  } | null
  categories: {
    categoryId: string;
    category: Pick<Category, "name">
  }[]
  clientStats: {
    projects: number
    hireRate: number
  }
}

export type ClientOrder = InferActionResult<typeof getClientOrders>
export type OrderByIdResponse = InferActionResult<typeof getOrderById>


