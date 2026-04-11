"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { OrderStatus } from "../../../../../prisma/generated"


// Наша AI-функция (в будущем сюда можно подключить OpenAI API)
async function classifyTaskWithAI(description: string): Promise<string> {
  const text = description.toLowerCase()
  
  // Простая логика ключевых слов (заглушка под реальный ИИ)
  if (text.includes("свет") || text.includes("розетк") || text.includes("провод")) return "Электрик"
  if (text.includes("кран") || text.includes("труб") || text.includes("унитаз") || text.includes("течет")) return "Сантехник"
  if (text.includes("собрать") || text.includes("шкаф") || text.includes("кухн")) return "Сборка мебели"
  if (text.includes("убрать") || text.includes("помыть") || text.includes("окн")) return "Клининг"
  
  return "Общие работы" // Категория по умолчанию
}

export async function createOrder(formData: {
  title: string
  description: string
  address: string
  price: number
}) {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    // 1. Запускаем AI-классификатор
    const category = await classifyTaskWithAI(formData.description)

    // 2. Создаем заказ с автоматически определенной категорией
    const newOrder = await prisma.order.create({
      data: {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        price: formData.price * 100, // Сохраняем в копейках
        category: category,         // Авто-категория от AI
        status: OrderStatus.PENDING,
        clientId: userId,
        lat: 55.75, // Здесь можно добавить геокодинг в будущем
        lng: 37.61,
      },
    })

    return { 
      success: true, 
      orderId: newOrder.id,
      aiCategory: category // Возвращаем категорию, чтобы показать её клиенту в тосте
    }
  } catch (error) {
    console.error("Order creation error:", error)
    return { success: false, error: "Не удалось опубликовать заказ" }
  }
}