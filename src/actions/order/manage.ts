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



// КЛИЕНТ: Подтвердить выполнение
export async function confirmOrderCompletion(orderId: string) {
  return createAuthAction(async (userId) => {
    return await prisma.order.update({
      where: { id: orderId, clientId: userId },
      data: { status: OrderStatus.COMPLETED }
    })
  })
}
