"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { CreateOrderValues } from "@/lib/validation"
import { OrderStatus } from "../../../../../prisma/generated"
import { getFallbackData, CATEGORY_KEYWORDS } from "@/lib/ai-fallback"

/**
 * Умный анализ задачи через Groq AI (Мультикатегорийность)
 */
async function analyzeTask(description: string) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY не настроен");

    const categoriesList = Object.keys(CATEGORY_KEYWORDS).join(", ");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Ты — диспетчер сервиса услуг. Проанализируй текст и верни ТОЛЬКО JSON.
            Доступные категории: [${categoriesList}].
            
            Твоя задача:
            1. Title: Краткая суть задачи (3-5 слов) на основе запрашиваемого текса.
            2. Categories: Массив строк. Выбери ВСЕ подходящие категории из списка, если нужной категории нет, добавь свою. 
               Если задача комплексная, укажи несколько.
            Максимальное количесво категорий : 7, минимальное: 1
            Формат ответа: {"title": "заголовок", "categories": ["кат1", "кат2"]}`
          },
          {
            role: "user",
            content: description
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(`Groq error: ${response.status}`);

    const result = await response.json();
    console.log(result)
    const content = JSON.parse(result.choices[0].message.content);

    return {
      title: content.title || "Новый заказ",
      categories : Array.isArray(content.categories) ? content.categories : ["Общие работы"]
    };
  } catch (error) {
    console.error("⚠️ AI Analysis failed, using fallback:", error);
    const fallback = getFallbackData(description);
    return { 
      title: fallback.title, 
      categories: [fallback.category] // Фолбек возвращает массив из одного элемента
    };
  }
}

/**
 * Создание заказа с поддержкой нескольких категорий
 */
export async function createOrder(formData: CreateOrderValues) {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) return { success: false, error: "Необходима авторизация" };

  try {
    // 1. Анализируем задачу (получаем массив категорий)
    const { title, categories } = await analyzeTask(formData.description);

    // 2. Транзакция: Создание заказа + Поиск мастеров + Уведомления
    const result = await prisma.$transaction(async (tx) => {
      
      
      // Создаем заказ (убедись, что в Prisma поле называется categories: String[])
      const newOrder = await tx.order.create({
        data: {
          title:title,
          description: formData.description,
          address: formData.address,
          price: formData.price * 100, // Копейки
          categories: categories, // МАССИВ
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: formData.lat,
          lng: formData.lng,
          dateType: formData.dateType,
        },
      });

      // Ищем мастеров, у которых в skills есть ХОТЯ БЫ ОДНА категория из заказа
      const matchingWorkers = await tx.profile.findMany({
        where: {
          skills: {
            hasSome: categories // Ключевой оператор Prisma для массивов
          },
          userId: { not: userId }
        },
        select: { userId: true }
      });

      // Создаем уведомления
      if (matchingWorkers.length > 0) {
        const mainCategory = categories[0]; // Для заголовка берем первую
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `Новая работа: ${mainCategory}${categories.length > 1 ? ' (+)' : ''} 🚀`,
            message: `${title}. Бюджет: ${formData.price > 0 ? formData.price + ' ₽' : 'Договорная'}`,
            type: "NEW_ORDER",
            link: `/pro/orders/${newOrder.id}`,
          })),
        });
      }

      return newOrder;
    });

    // Обновляем кэш
    revalidatePath("/pro/feed");
    revalidatePath("/client/orders");

    return {
      success: true,
      orderId: result.id,
      aiCategories: result.categories // Возвращаем массив для UI
    };

  } catch (error) {
    console.error("CRITICAL_ORDER_ERROR:", error);
    return { success: false, error: "Не удалось опубликовать заказ" };
  }
}
