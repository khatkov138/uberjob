"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { CreateOrderValues } from "@/lib/validation"
import { OrderStatus } from "../../../prisma/generated"

async function analyzeTask(description: string) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY_MISSING");

    const response = await fetch("https://groq.com", {
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
            content: `Ты — диспетчер Uberjob. Твоя задача: проанализировать запрос и вернуть JSON.
            Формат JSON:
            {
              "title": "краткое название услуги",
              "categories": [
                { "name": "Название категории", "keywords": ["ключ1", "ключ2"] }
              ]
            }`
          },
          { role: "user", content: description }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  } catch (error) {
    console.error("AI Error:", error);
    return { title: "Новый заказ", categories: [{ name: "Общие работы", keywords: [] }] };
  }
}

export async function createOrder(formData: CreateOrderValues) {
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Необходима авторизация" };

  try {
    // 1. ИИ определяет категории и заголовок
    const aiResponse = await analyzeTask(formData.description);

    // 2. Синхронизируем справочник категорий и получаем их ID
    const categoryIds = await Promise.all(
      aiResponse.categories.map(async (cat: any) => {
        const dbCategory = await prisma.category.upsert({
          where: { name: cat.name },
          update: {
            // Обновляем ключевые слова, если их не было (для будущего поиска)
            keywords: { set: cat.keywords }
          },
          create: {
            name: cat.name,
            keywords: cat.keywords || []
          },
          select: { id: true }
        });
        return dbCategory.id;
      })
    );

    // 3. Создаем заказ и уведомления в одной транзакции
    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          title: aiResponse.title,
          description: formData.description,
          address: formData.address,
          price: Math.round(Number(formData.price) * 100), // Копейки
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: formData.lat,
          lng: formData.lng,
          dateType: formData.dateType,
          // Создаем связи в промежуточной таблице order_category
          categories: {
            create: categoryIds.map((id) => ({
              categoryId: id,
            })),
          },
        },
      });

      // 4. Поиск мастеров, у которых в ProfileCategory есть эти categoryId
      const matchingWorkers = await tx.profile.findMany({
        where: {
          skills: {
            some: {
              categoryId: { in: categoryIds }
            }
          },
          userId: { not: userId }
        },
        select: { userId: true }
      });

      // 5. Рассылка уведомлений
      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `Новый заказ: ${aiResponse.title}`,
            message: `Подходит под ваши навыки. Предложите свою цену!`,
            type: "NEW_ORDER",
            link: `/pro/orders/${newOrder.id}`,
          })),
        });
      }

      return newOrder;
    });

    revalidatePath("/pro/feed");
    revalidatePath("/client/orders");

    return { success: true, orderId: result.id };

  } catch (error) {
    console.error("CREATE_ORDER_ERROR:", error);
    return { success: false, error: "Ошибка при публикации заказа." };
  }
}
