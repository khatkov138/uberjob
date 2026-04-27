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
export async function acceptOffer(orderId: string, offerId: string, workerId: string) {
  return createAuthAction(async (userId) => {
    // Важно: проверяем, что заказ принадлежит текущему клиенту
    const order = await prisma.order.findUnique({ where: { id: orderId, clientId: userId } })
    if (!order) throw new Error("Заказ не найден или доступ запрещен")

    return await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { status: "ACCEPTED", workerId } }),
      prisma.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } }),
      prisma.offer.updateMany({ where: { orderId, id: { not: offerId } }, data: { status: "REJECTED" } })
    ])
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
