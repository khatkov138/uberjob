"use server"

import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"
import { delay, getDistance } from "@/lib/utils"
import { OrderStatus, Prisma } from "@prisma/client"

// ЛЕНТА (Исполнитель)
export async function getOrders({ lat, lng, radius = 60 }: { lat?: number, lng?: number, radius?: number }) {
  //await delay(2000);
  
  return createAuthAction(async (userId) => {
    const [allOrders, profile] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: "PENDING",
         // clientId: { not: userId }
        },
        include: {
          client: {
            select: {
              name: true,
              image: true,
              _count: {
                select: {
                  ordersCreated: true, // Сколько всего создал заказов
                }
              },
              // Чтобы посчитать Hire Rate, нам нужно знать, сколько заказов реально завершено
              ordersCreated: {
                where: { status: "COMPLETED" },
                select: { id: true }
              }
            }
          },
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

    return allOrders.map((order) => {
      const distance = lat && lng && order.lat && order.lng
        ? getDistance(lat, lng, order.lat, order.lng)
        : null

      const isMatch = order.categories.some(c => masterCategoryIds.includes(c.categoryId))

      // Считаем статы клиента
      const totalProjects = order.client._count.ordersCreated
      const completedProjects = order.client.ordersCreated.length
      const hireRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0

      return {
        ...order,
        distance,
        isMatch,
        offersCount: order._count?.offers || 0,
        clientStats: {
          projects: totalProjects,
          hireRate: hireRate
        }
      }
    })
      // Оставляем фильтр ТОЛЬКО по радиусу (география важнее категорий на старте)
      .filter(order => !lat || !lng || (order.distance ?? 0) <= radius)
      // Сортируем: сначала те, что "в масть", потом все остальные
      .sort((a, b) => (a.isMatch === b.isMatch ? 0 : a.isMatch ? -1 : 1))
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

