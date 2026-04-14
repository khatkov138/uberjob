"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"

import { revalidatePath } from "next/cache"
import { OrderStatus } from "../../../../../prisma/generated"

/**
 * Логика AI-анализа.
 * В будущем здесь будет вызов OpenAI/Gemini.
 * Сейчас реализуем расширенную логику: Генерация заголовка + Категория.
 */
async function analyzeTaskWithAI(description: string) {
  const text = description.toLowerCase();
  let category = "Общие работы";

  if (text.includes("свет") || text.includes("розетк") || text.includes("провод")) category = "Электрика";
  else if (text.includes("кран") || text.includes("труб") || text.includes("унитаз") || text.includes("течет")) category = "Сантехника";
  else if (text.includes("собрать") || text.includes("шкаф") || text.includes("кухн")) category = "Сборка мебели";
  else if (text.includes("убрать") || text.includes("помыть") || text.includes("окн")) category = "Уборка";
  else if (text.includes("яма") || text.includes("откач")) category = "Ассенизация";
  else if (text.includes("груз") || text.includes("переезд")) category = "Грузоперевозки";
  else if (text.includes("стена") || text.includes("краск") || text.includes("обои")) category = "Малярные работы";

  // Генерируем заголовок (как и раньше)
  const title = description.length > 50 ? description.substring(0, 47) + "..." : description;

  return { title, category };
}

export async function createOrder(formData: {
  description: string
  address: string
  price: number
  lat: number
  lng: number
  dateType: "ASAP" | "SCHEDULED"
}) {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) return { success: false, error: "Сессия не найдена" }

  try {
    // Вызываем "ИИ" для анализа
    const { title, category } = await analyzeTaskWithAI(formData.description)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Создаем заказ
      const newOrder = await tx.order.create({
        data: {
          title: title, // Сгенерировано ИИ
          description: formData.description,
          address: formData.address,
          price: formData.price * 100, // Храним в копейках
          category: category,
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: formData.lat,
          lng: formData.lng,
          // Добавь эти поля в схему Prisma, если их еще нет:
        
        },
      })

      // 2. Уведомляем мастеров с подходящими навыками
      const matchingWorkers = await tx.user.findMany({
        where: {
          role: "PRO",
          //id: { not: userId },
          workerProfile: {
            skills: {
              has: category
            }
          }
        }
      })

      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.id,
            title: `Новый заказ: ${category} 🚀`,
            message: `Появилась работа по вашему профилю: ${title}`,
            type: "NEW_ORDER",
            link: `/pro/orders/${newOrder.id}`,
          })),
        })
      }

      return newOrder
    })

    revalidatePath("/pro/feed")
    revalidatePath("/client/orders")

    return {
      success: true,
      orderId: result.id,
      aiCategory: result.category
    }
  } catch (error) {
    console.error("Order creation error:", error)
    return { success: false, error: "Ошибка при создании заказа" }
  }
}
