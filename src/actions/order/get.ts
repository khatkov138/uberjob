"use server"

import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"
import { getDistance } from "@/lib/utils"
import { Prisma } from "@prisma/client"

// ЛЕНТА (Мастер)
export async function getOrders({ lat, lng, radius = 60 }: { lat?: number, lng?: number, radius?: number }) {
  return createAuthAction(async (userId) => {
    const [allOrders, profile] = await Promise.all([
      prisma.order.findMany({
        //  where: { status: "PENDING", clientId: { not: userId } },
        where: { status: "PENDING" },
        include: {
          client: { select: { name: true, image: true, _count: { select: { ordersCreated: true } } } },
          categories: { include: { category: true } },
          _count: { select: { offers: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.profile.findUnique({
        where: { userId },
        select: { skills: { select: { categoryId: true } } }
      })
    ])

    const masterCategoryIds = profile?.skills.map(s => s.categoryId) || []

    return allOrders
      .map((order) => {
        const distance = lat && lng && order.lat && order.lng
          ? getDistance(lat, lng, order.lat, order.lng)
          : null
        const isMatch = order.categories.some(c => masterCategoryIds.includes(c.categoryId))
        return { ...order, distance, isMatch, offersCount: order._count?.offers || 0 }
      })
      .filter(order => !lat || !lng || (order.distance ?? 0) <= radius)
      .sort((a, b) => (a.isMatch === b.isMatch ? 0 : a.isMatch ? -1 : 1))
  })
}


export type FeedOrder = InferActionResult<typeof getOrders>


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
export type ClientOrder = InferActionResult<typeof getClientOrders>

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
export type OrderByIdResponse = InferActionResult<typeof getOrderById>



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

export type OrderDetails = InferActionResult<typeof getOrderDetails>
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

