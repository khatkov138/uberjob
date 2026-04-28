"use server"

import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"
import { OrderStatus } from "@prisma/client"

// МАСТЕР: Завершить работу
export async function completeOrder(orderId: string) {
  return createAuthAction(async (userId) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order || order.workerId !== userId) throw new Error("Доступ запрещен")

    return await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED },
    })
  })
}

// КЛИЕНТ: Принять отклик мастера
export async function acceptOffer(orderId: string, offerId: string) {
  // Убрали workerId из аргументов — это безопаснее
  return createAuthAction(async (userId) => {

    return await prisma.$transaction(async (tx) => {
      // 1. Проверяем заказ и оффер ОДНИМ запросом
      const offer = await tx.offer.findFirst({
        where: {
          id: offerId,
          orderId: orderId,
          order: { clientId: userId } // Проверка владения заказом
        },
        select: { workerId: true }
      })

      if (!offer) throw new Error("Оффер не найден или у вас нет прав")

      // 2. Обновляем статус заказа и назначаем мастера
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "ACCEPTED",
          workerId: offer.workerId // Берем ID из БД, а не с фронта
        }
      })

      // 3. Принимаем этот оффер
      await tx.offer.update({
        where: { id: offerId },
        data: { status: "ACCEPTED" }
      })

      // 4. Отклоняем остальные
      await tx.offer.updateMany({
        where: {
          orderId,
          id: { not: offerId }
        },
        data: { status: "REJECTED" }
      })

      return updatedOrder
    })
  })
}

// КЛИЕНТ: Подтвердить выполнение
export async function confirmOrderCompletion(orderId: string) {
  return createAuthAction(async (userId) => {
    return await prisma.order.update({
      where: { id: orderId, clientId: userId },
      data: { status: OrderStatus.COMPLETED }
    })
  })
}
