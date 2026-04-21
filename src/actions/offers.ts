"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"



export async function createOffer(data: { orderId: string, price: number, message: string }) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Нужна авторизация" }

  try {
    // 1. Проверяем состояние заказа
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { status: true, clientId: true, title: true }
    })

    if (!order) return { success: false, error: "Заказ не найден" }
    //if (order.clientId === userId) return { success: false, error: "Нельзя откликаться на свой заказ" }
    
    // Принимаем отклики только на новые заказы
    if (order.status !== "PENDING" && order.status !== "SEARCHING") {
      return { success: false, error: "Заказ уже в работе или закрыт" }
    }

    // 2. Выполняем действия в базе
    await prisma.$transaction(async (tx) => {
      // Создаем или обновляем существующий отклик
      await tx.offer.upsert({
        where: {
          orderId_workerId: {
            orderId: data.orderId,
            workerId: userId
          }
        },
        create: {
          orderId: data.orderId,
          workerId: userId,
          price: data.price,
          message: data.message,
        },
        update: {
          price: data.price,
          message: data.message,
        }
      })

      // Переводим статус в "Поиск" (если он был PENDING)
      await tx.order.update({
        where: { id: data.orderId },
        data: { status: "SEARCHING" }
      })

      // Уведомляем клиента о новом/обновленном предложении
      await tx.notification.create({
        data: {
          userId: order.clientId,
          title: "Новое предложение! 💰",
          message: `Мастер предложил ${data.price / 100} ₽ за: ${order.title}`,
          type: "NEW_OFFER",
          link: `/client/orders/${data.orderId}`,
        }
      })
    })

  
    
    return { success: true }
  } catch (error) {
    console.error("OFFER_ERROR:", error)
    return { success: false, error: "Ошибка при отправке предложения" }
  }
}




export async function getMyOffers() {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const offers = await prisma.offer.findMany({
      where: { workerId: userId },
      include: {
        order: {
          select: {
            id: true,
            title: true,
            address: true,
            status: true,
            categories: true,
            // Добавляем выборку клиента для конкретного заказа
            client: {
              select: {
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: offers }
  } catch (error) {
    console.error("MY_OFFERS_ERROR:", error)
    return { success: false, error: "Ошибка загрузки данных" }
  }
}