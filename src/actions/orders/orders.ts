"use server"


import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { getServerSession } from "@/lib/get-session"
import { OrderStatus } from "../../../prisma/generated"
import { getDistance } from "@/lib/utils"




// Получить заказы, которые Я ВЗЯЛ В РАБОТУ (как мастер)
export async function getProWorkOrders() {
  const session = await getServerSession()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const orders = await prisma.order.findMany({
      where: {
        workerId: session.user.id,
        status: { in: [OrderStatus.ACCEPTED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] }
      },
      orderBy: { updatedAt: "desc" },
      include: { client: { select: { name: true, image: true } } }
    })
    return { success: true, data: orders }
  } catch (e) {
    return { success: false, error: "Ошибка при загрузке ваших работ" }
  }
}


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
          workerProfile: { select: { id: true, rating: true, skills: true } }
        },
      },
      review: true,
      messages: {
        orderBy: { createdAt: 'asc' } // Сортируем сообщения от старых к новым
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


export async function getProOrders() {
  const session = await getServerSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  try {
    const orders = await prisma.order.findMany({
      where: {
        workerId: session.user.id
      },
      include: {
        client: { select: { name: true, image: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })
    return { success: true, data: orders }
  } catch (e) {
    return { success: false, error: "Ошибка загрузки" }
  }
}

export async function getOrders(
  lat?: number,
  lng?: number,
  radiusKm: number = 60
) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    // 1. Получаем ID категорий (скиллов) мастера
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        skills: {
          select: { categoryId: true }
        }
      }
    })

    const masterCategoryIds = profile?.skills.map(s => s.categoryId) || []

    // 2. Запрашиваем заказы
    const allOrders = await prisma.order.findMany({
      where: { status: "PENDING" },
      include: {
        client: {
          select: {
            name: true,
            image: true,
            _count: { select: { ordersCreated: true } }
          }
        },
        // Вот здесь часто бывает ошибка в названиях полей
        categories: {
          include: {
            category: true // Это подтянет саму модель Category (с полем name)
          }
        },
        _count: {
          select: { offers: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!lat || !lng) return { success: true, data: [] }

    // 3. Обработка, расчет дистанции и разметка Match
    const ordersWithDistance = allOrders
      .map(order => {
        const distance = getDistance(lat, lng, order.lat ?? 0, order.lng ?? 0);

        // Проверяем совпадение через пересечение массивов ID
        const orderCategoryIds = order.categories.map(c => c.categoryId);
        const isMatch = orderCategoryIds.some(id => masterCategoryIds.includes(id));

        return {
          ...order,
          distance,
          isMatch,
          client: {
            name: order.client?.name || "Заказчик",
            image: order.client?.image,
            projects: order.client?._count.ordersCreated || 0,
            hireRate: 0
          },
          offersCount: order._count?.offers || 0
        }
      })
      .filter(order => order.distance <= radiusKm)
      .sort((a, b) => {
        // 1. Приоритет: Сначала подходящие по навыкам
        if (a.isMatch && !b.isMatch) return -1;
        if (!a.isMatch && b.isMatch) return 1;

        // 2. Внутри групп: Сначала самые новые
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return { success: true, data: ordersWithDistance }
  } catch (error) {
    console.error("FEED_ERROR:", error)
    return { success: false, error: "Не удалось обновить ленту" }
  }
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







