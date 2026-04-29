"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"
import { delay, getDistance } from "@/lib/utils"
import { Category, Order, OrderStatus, Prisma } from "@prisma/client"

// ЛЕНТА (Исполнитель)


export async function getOrders({ lat, lng, radius = 60 }: { lat?: number, lng?: number, radius?: number }) {
  return createAuthAction(async (userId) => {
   // await delay(2000)
    // 1. Получаем категории (скиллы) мастера для расчета isMatch
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { skills: { select: { categoryId: true } } }
    })
    const skillIds = profile?.skills.map(s => s.categoryId) || []

    // 2. Основной SQL Запрос для получения заказов и гео-дистанции
    // Используем raw query, так как Prisma пока плохо умеет в сложные математические формулы для радиуса
    const raw = await prisma.$queryRaw<(Order & {
      distance: number
      is_match: number
      total_p: bigint
      comp_p: bigint
      off_c: bigint
    })[]>`
      SELECT o.*,
        (6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat)))) AS distance,
        (SELECT COUNT(*) FROM "order" WHERE "clientId" = o."clientId") as total_p,
        (SELECT COUNT(*) FROM "order" WHERE "clientId" = o."clientId" AND "status" = 'COMPLETED') as comp_p,
        (SELECT COUNT(*) FROM "offer" WHERE "orderId" = o.id) as off_c,
        EXISTS (
          SELECT 1 FROM "order_category" oc 
          WHERE oc."orderId" = o.id AND oc."categoryId" IN (${skillIds.length > 0 ? skillIds : ['']})
        ) as is_match
      FROM "order" o
      WHERE o.status = 'PENDING'
      AND (6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat)))) <= ${radius}
      ORDER BY is_match DESC, o."createdAt" DESC
    `

    if (!raw.length) return []

    // 3. Дозагрузка связанных данных (Категории)
    const categories = await prisma.orderCategory.findMany({
      where: { orderId: { in: raw.map(o => o.id) } },
      include: { category: { select: { name: true } } }
    })

    // 4. Дозагрузка данных КЛИЕНТОВ (Заказчиков) — ИСПРАВЛЕНИЕ ТИПА
    const clientIds = [...new Set(raw.map(o => o.clientId))]
    const clients = await prisma.user.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true, image: true }
    })

    // 5. Маппинг в итоговый формат FeedOrder
    const result: FeedOrder[] = raw.map((o): FeedOrder => {
      const total = Number(o.total_p)
      const completed = Number(o.comp_p)

      // Находим конкретного клиента для этого заказа
      const client = clients.find(c => c.id === o.clientId)

      return {
        id: o.id,
        title: o.title,
        description: o.description,
        price: Number(o.price),
        address: o.address,
        lat: o.lat,
        lng: o.lng,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        status: o.status,
        dateType: o.dateType,
        clientId: o.clientId,
        workerId: o.workerId,

        // Вычисляемые поля (строгая типизация)
        distance: o.distance ? Math.round(Number(o.distance) * 10) / 10 : null,
        isMatch: Boolean(o.is_match),
        offersCount: Number(o.off_c),

        // Данные клиента для OrderCard
        client: client ? {
          name: client.name,
          image: client.image
        } : null,

        clientStats: {
          projects: total,
          hireRate: total > 0 ? Math.round((completed / total) * 100) : 0
        },

        categories: categories
          .filter(c => c.orderId === o.id)
          .map(c => ({
            categoryId: c.categoryId,
            category: { name: c.category.name }
          }))
      }
    })

    return result
  })
}
// МОИ ЗАКАЗЫ (Клиент)
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

/**
 * ПОСЛЕДНИЕ ПУБЛИЧНЫЕ ЗАКАЗЫ
 * Публичный экшен: доступен без авторизации через createAction
 */
export async function getLatestPublicOrders() {
  return createAction(async () => {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        categories: {
          include: {
            category: true
          }
        },
        address: true,
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


