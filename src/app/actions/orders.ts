"use server"


import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { OrderStatus } from "../../../prisma/generated"
import { getServerSession } from "@/lib/get-session"


// Получить заказы, которые Я СОЗДАЛ (как клиент)
export async function getClientOrders() {
  const session = await getServerSession()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const orders = await prisma.order.findMany({
      where: { clientId: session.user.id },
      orderBy: { createdAt: "desc" },
      // Можно сразу подтянуть данные мастера, если заказ принят
      include: { worker: { select: { name: true, image: true } } }
    })
    return { success: true, data: orders }
  } catch (e) {
    return { success: false, error: "Ошибка при загрузке ваших заказов" }
  }
}

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