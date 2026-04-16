"use server"


import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { getServerSession } from "@/lib/get-session"
import { OrderStatus } from "../../../prisma/generated"




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





