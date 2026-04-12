"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { OrderStatus } from "../../../../../prisma/generated"

async function classifyTaskWithAI(description: string): Promise<string> {
  const text = description.toLowerCase()
  if (text.includes("свет") || text.includes("розетк") || text.includes("провод")) return "Электрик"
  if (text.includes("кран") || text.includes("труб") || text.includes("унитаз") || text.includes("течет")) return "Сантехник"
  if (text.includes("собрать") || text.includes("шкаф") || text.includes("кухн")) return "Сборка мебели"
  if (text.includes("убрать") || text.includes("помыть") || text.includes("окн")) return "Клининг"

  return "Общие работы"
}

export async function createOrder(formData: {
  title: string
  description: string
  address: string
  price: number
  lat?: number // Добавляем опциональные поля
  lng?: number
}) {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const category = await classifyTaskWithAI(formData.description)

    // Используем транзакцию, чтобы заказ и уведомления создавались одновременно
    const result = await prisma.$transaction(async (tx) => {
      // 1. Создаем заказ
      const newOrder = await tx.order.create({
        data: {
          title: formData.title,
          description: formData.description,
          address: formData.address,
          price: formData.price * 100,
          category: category,
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: formData.lat || 55.75, // дефолт Москва, если не определилось
          lng: formData.lng || 37.61,
        },
      })

      // 2. Ищем мастеров (PRO), у которых в навыках (skills) есть эта категория
      const matchingWorkers = await tx.user.findMany({
        where: {
          role: "PRO",
          id: { not: userId }, // не уведомляем автора
          workerProfile: {
            skills: {
              has: category // проверка наличия строки в массиве
            }
          }
        }
      })

      // 3. Создаем уведомления для всех найденных мастеров
      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.id,
            title: `Новый заказ: ${category} 🚀`,
            message: `${formData.title}. Бюджет: ${formData.price} ₽`,
            type: "NEW_ORDER",
            link: `/pro/orders/${newOrder.id}`,
          })),
        })
      }

      return newOrder
    })

    return {
      success: true,
      orderId: result.id,
      aiCategory: result.category
    }
  } catch (error) {
    console.error("Order creation error:", error)
    return { success: false, error: "Не удалось опубликовать заказ" }
  }
}