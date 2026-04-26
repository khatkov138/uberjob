"use server"


import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { getServerSession } from "@/lib/get-session"


import { OrderStatus, Prisma } from "@prisma/client"
import { getDistance } from "@/lib/utils"
import { createAuthAction } from "@/lib/server-utils"






export async function completeOrder(orderId: string) {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Проверяем, что заказ существует и принадлежит этому мастеру
      const order = await tx.order.findUnique({
        where: { id: orderId },
      })

      if (!order) throw new Error("Заказ не найден")
      if (order.workerId !== userId) throw new Error("Это не ваш заказ")
      if (order.status !== OrderStatus.ACCEPTED && order.status !== OrderStatus.IN_PROGRESS) {
        throw new Error("Заказ нельзя завершить в текущем статусе")
      }

      // 2. Обновляем статус
      return await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETED },
      })
    })

    revalidatePath("/pro")
    revalidatePath("/client")
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getClientOrders() {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const orders = await prisma.order.findMany({
      where: { clientId: userId },
      include: {
        offers: {
          include: {
            worker: {
              select: {
                name: true,
                image: true,
                profile: {
                  select: { rating: true, skills: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: orders }
  } catch (error) {
    return { success: false, error: "Ошибка загрузки" }
  }
}

export async function acceptOffer(orderId: string, offerId: string, workerId: string) {
  try {
    await prisma.$transaction([
      // 1. Помечаем заказ как принятый и назначаем мастера
      prisma.order.update({
        where: { id: orderId },
        data: { status: "ACCEPTED", workerId }
      }),
      // 2. Помечаем выбранный отклик как принятый
      prisma.offer.update({
        where: { id: offerId },
        data: { status: "ACCEPTED" }
      }),
      // 3. Остальные отклики отклоняем
      prisma.offer.updateMany({
        where: { orderId, id: { not: offerId } },
        data: { status: "REJECTED" }
      })
    ])

    revalidatePath("/client/my-orders")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Не удалось принять предложение" }
  }
}



export async function getOrderDetails(orderId: string) {
  const session = await getServerSession()
  if (!session?.user) return null

  return await prisma.order.findUnique({
    where: { id: orderId, clientId: session.user.id },
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
        orderBy: { createdAt: 'asc' } // Сортируем сообщения от старых к новым
      },
      categories: {
        include: {
          category: true
        }
      },
    },
  })
}

// Экшен для подтверждения, что работа реально сделана (после того как мастер нажал "Завершить")
export async function confirmOrderCompletion(orderId: string) {
  const session = await getServerSession()
  if (!session?.user) return { success: false }

  await prisma.order.update({
    where: { id: orderId, clientId: session.user.id },
    data: { status: OrderStatus.COMPLETED }
  })

  revalidatePath(`/client/orders/${orderId}`)
  return { success: true }
}




export async function getOrderById(id: string) {
  const session = await getServerSession()
  const userId = session?.user?.id

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          name: true,
          image: true,
          createdAt: true,
          _count: { select: { ordersCreated: true } }
        }
      },
      // ОБЯЗАТЕЛЬНО: Подтягиваем наши новые категории
      categories: {
        include: {
          category: true
        }
      },
      _count: {
        select: { offers: true }
      }
    }
  })

  if (!order) return null

  let existingOffer = null
  if (userId) {
    existingOffer = await prisma.offer.findFirst({
      where: {
        orderId: id,
        workerId: userId
      }
    })
  }

  return {
    order,
    existingOffer: !!existingOffer,
    userId
  }
}

// 1. Вспомогательная функция для вывода типов Prisma
async function getRawOrdersQuery() {
  return await prisma.order.findMany({
    where: { status: "PENDING" },
    include: {
      client: {
        select: {
          name: true,
          image: true,
          _count: { select: { ordersCreated: true } }
        }
      },
      categories: { include: { category: true } },
      _count: { select: { offers: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

// 2. Генерируем типы автоматически
type RawOrder = Prisma.PromiseReturnType<typeof getRawOrdersQuery>[number]

export type FeedOrder = RawOrder & {
  distance: number | null
  isMatch: boolean
  offersCount: number
}

interface GetOrdersParams {
  lat?: number
  lng?: number
  radius?: number
}

// 3. Основной экшен
export async function getOrders({ lat, lng, radius = 60 }: GetOrdersParams) {
  // Вызываем наш хелпер прямо здесь
  return createAuthAction(async (userId) => {

    // 1. Загружаем данные
    const [allOrders, profile] = await Promise.all([
      getRawOrdersQuery(),
      prisma.profile.findUnique({
        where: { userId },
        select: { skills: { select: { categoryId: true } } }
      })
    ])

    const masterCategoryIds = profile?.skills.map(s => s.categoryId) || []

    // 2. Обрабатываем и возвращаем данные
    return allOrders
      .map((order): FeedOrder => {
        const distance = lat && lng && order.lat && order.lng
          ? getDistance(lat, lng, order.lat, order.lng)
          : null

        const isMatch = order.categories.some(c =>
          masterCategoryIds.includes(c.categoryId)
        )

        return {
          ...order,
          distance,
          isMatch,
          offersCount: order._count?.offers || 0
        }
      })
      .filter(order => !lat || !lng || (order.distance ?? 0) <= radius)
      .sort((a, b) => (a.isMatch === b.isMatch ? 0 : a.isMatch ? -1 : 1))
  })
}



