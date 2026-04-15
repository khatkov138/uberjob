"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createOffer(data: { orderId: string, price: number, message: string }) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Нужна авторизация" }

  try {
    // ПРОВЕРКА: открыт ли заказ для предложений
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { status: true }
    })

    if (!order) return { success: false, error: "Заказ не найден" }
    
    // Если статус не PENDING и не SEARCHING — значит исполнитель уже в процессе выбора или выбран
    if (order.status !== "PENDING" && order.status !== "SEARCHING") {
      return { success: false, error: "Исполнитель уже выбран. Этот заказ закрыт для новых предложений." }
    }

    // Создаем отклик
    await prisma.offer.create({
      data: {
        orderId: data.orderId,
        workerId: userId,
        price: data.price,
        message: data.message,
      }
    })

    revalidatePath(`/pro/orders/${data.orderId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: "Не удалось отправить отклик" }
  }
}
