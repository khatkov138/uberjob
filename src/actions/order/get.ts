"use server"

import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"
import { delay, getDistance } from "@/lib/utils"
import { OrderStatus, Prisma } from "@prisma/client"

// ЛЕНТА (Исполнитель)

export async function getOrders({ lat, lng, radius = 60 }: { lat?: number, lng?: number, radius?: number }) {
  return createAuthAction(async (userId) => {
    // 1. Категории мастера
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { skills: { select: { categoryId: true } } }
    })
    const skillIds = profile?.skills.map(s => s.categoryId) || []

    // 2. SQL запрос с именами таблиц из твоих @@map
    // Все агрегаты (COUNT) в Postgres возвращаются как BigInt
    const nearbyOrders = await prisma.$queryRaw<(Prisma.OrderGetPayload<{}> & {
      distance: number
      is_match: number
      total_projects: bigint
      completed_projects: bigint
      offers_count: bigint
    })[]>`
      SELECT o.*,
        (6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat)))) AS distance,
        (SELECT COUNT(*) FROM "order" WHERE "clientId" = o."clientId") as total_projects,
        (SELECT COUNT(*) FROM "order" WHERE "clientId" = o."clientId" AND "status" = 'COMPLETED') as completed_projects,
        (SELECT COUNT(*) FROM "offer" WHERE "orderId" = o.id) as offers_count,
        EXISTS (
          SELECT 1 FROM "order_category" oc 
          WHERE oc."orderId" = o.id AND oc."categoryId" IN (${skillIds.length > 0 ? skillIds : ['']})
        ) as is_match
      FROM "order" o
      WHERE o.status = 'PENDING'
      AND (6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat)))) <= ${radius}
      ORDER BY is_match DESC, o."createdAt" DESC
    `

    if (!nearbyOrders.length) return []

    // 3. Дозагрузка категорий через Prisma
    const orderIds = nearbyOrders.map(o => o.id)
    const categoriesData = await prisma.orderCategory.findMany({
      where: { orderId: { in: orderIds } },
      include: { category: true }
    })

    // 4. Мапим результат, принудительно превращая BigInt в Number для JSON
    return nearbyOrders.map(o => {
      const total = Number(o.total_projects)
      const completed = Number(o.completed_projects)

      return {
        // Явно перечисляем поля, чтобы не прокинуть сырой BigInt из o.*
        id: o.id,
        title: o.title,
        description: o.description,
        price: Number(o.price), // На всякий случай кастим цену, если она BigInt
        address: o.address,
        lat: o.lat,
        lng: o.lng,
        createdAt: o.createdAt,
        status: o.status,
        clientId: o.clientId,

        // Наши вычисляемые поля
        distance: o.distance ? Math.round(Number(o.distance) * 10) / 10 : null,
        isMatch: Boolean(o.is_match),
        offersCount: Number(o.offers_count),
        categories: categoriesData
          .filter(c => c.orderId === o.id)
          .map(c => ({ categoryId: c.categoryId, category: c.category })),
        clientStats: {
          projects: total,
          hireRate: total > 0 ? Math.round((completed / total) * 100) : 0
        }
      }
    })
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


// ДЕТАЛИ ЗАКАЗА
export async function getOrderById(id: string) {
  return createAuthAction(async (userId) => {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, image: true, createdAt: true, _count: { select: { ordersCreated: true } } } },
        categories: { include: { category: true } },
        _count: { select: { offers: true } }
      }
    })
    if (!order) throw new Error("Заказ не найден")
    const existingOffer = await prisma.offer.findFirst({ where: { orderId: id, workerId: userId } })
    return { order, existingOffer: !!existingOffer, userId }
  })
}


export async function getOrderDetails(orderId: string) {
  return createAuthAction(async (userId) => {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        clientId: userId // Безопасность: только владелец заказа видит детали
      },
      include: {
        worker: {
          select: {
            name: true,
            image: true,
            profile: { select: { id: true, rating: true, skills: true } }
          },
        },
        review: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        categories: {
          include: {
            category: true
          }
        },
      },
    });

    if (!order) throw new Error("Заказ не найден или доступ запрещен");

    return order;
  });
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

export type FeedOrder = InferActionResult<typeof getOrders>

export type ClientOrder = InferActionResult<typeof getClientOrders>
export type OrderDetails = InferActionResult<typeof getOrderDetails>
export type OrderByIdResponse = InferActionResult<typeof getOrderById>

