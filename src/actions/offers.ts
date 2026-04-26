"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"



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


// 1. Описываем функцию ЗАПРОСА (только данные)
const getMyOffersData = async (userId: string) => {
  return await prisma.offer.findMany({
    where: { workerId: userId },
    include: {
      order: {
        include: {
          client: { select: { name: true, image: true } },
          categories: { include: { category: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

// 2. ЭКСПОРТИРУЕМ ТИП данных (для компонента)
export type MyOffersWithData = Prisma.PromiseReturnType<typeof getMyOffersData>

// 3. ЭКСПОРТИРУЕМ ЭКШЕН (для страницы)
export async function getMyOffers() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized", data: [] as MyOffersWithData }
  }

  try {
    const data = await getMyOffersData(session.user.id)
    return { success: true, data, error: null }
  } catch (e) {
    return { success: false, error: "Database error", data: [] as MyOffersWithData }
  }
}
