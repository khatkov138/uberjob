"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { CreateOrderValues } from "@/lib/validation"
import { OrderStatus } from "@prisma/client"
import { createAuthAction } from "@/lib/server-utils"

async function analyzeTask(description: string) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    const uri = process.env.GROQ_URI;

    if (!apiKey || !uri) throw new Error("Конфигурация ИИ отсутствует");

    const existing = await prisma.category.findMany({
      select: { name: true },
      take: 60
    });
    const categoriesContext = existing.map(c => c.name).join(", ");

    const response = await fetch(uri, {
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
            content: `Ты — старший диспетчер ZWORK. Классифицируй заказ.
            СПИСОК НИШ: [${categoriesContext}]
            
            ПРАВИЛА:
            1. Если ниши нет — создай новую (ед.ч., с Большой буквы).
            2. Формат строго JSON.
            3. Будь технически точен.`
          },
          { role: "user", content: description }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      })
    });

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content;

    if (!rawContent) throw new Error("ИИ вернул пустой ответ");

    const content = JSON.parse(rawContent.replace(/```json|```/g, "").trim());

    if (content.categories) {
      content.categories = content.categories.map((c: any) => ({
        name: c.name.trim().charAt(0).toUpperCase() + c.name.trim().slice(1).toLowerCase(),
        keywords: Array.isArray(c.keywords) ? c.keywords : []
      })).slice(0, 3);
    }

    return content;
  } catch (error) {
    console.error("ZWORK_AI_ERROR:", error);
    // Важно: кидаем ошибку, чтобы createAuthAction её поймал!
    throw new Error(error instanceof Error ? error.message : "Ошибка анализа текста");
  }
}



export async function createOrder(formData: CreateOrderValues) {
  // Возвращаем результат вызова обертки — это лечит типы для handleAction
  return createAuthAction(async (userId) => {

    // 1. ИИ определяет категории и заголовок
    const aiResponse = await analyzeTask(formData.description);

    // 2. Синхронизируем справочник категорий
    const categoryIds = await Promise.all(
      aiResponse.categories.map(async (cat: any) => {
        const dbCategory = await prisma.category.upsert({
          where: { name: cat.name },
          update: {
            keywords: { set: cat.keywords },
          },
          create: {
            name: cat.name,
            keywords: cat.keywords || [],
          },
          select: { id: true },
        });
        return dbCategory.id;
      })
    );

    // 3. Транзакция: Создание заказа и уведомлений
    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          title: aiResponse.title,
          description: formData.description,
          address: formData.address,
          price: Math.round(Number(formData.price) * 100),
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: formData.lat,
          lng: formData.lng,
          dateType: formData.dateType,
          categories: {
            create: categoryIds.map((id) => ({
              categoryId: id,
            })),
          },
        },
      });

      // 4. Поиск подходящих мастеров
      const matchingWorkers = await tx.profile.findMany({
        where: {
          skills: {
            some: { categoryId: { in: categoryIds } },
          },
          userId: { not: userId },
        },
        select: { userId: true },
      });

      // 5. Создание уведомлений
      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `Новый заказ: ${aiResponse.title}`,
            message: `Подходит под ваши навыки.`,
            type: "NEW_ORDER",
            link: `/pro/orders/${newOrder.id}`,
          })),
        });
      }

      return newOrder;
    });

    // Убрали revalidatePath — теперь всё на совести TanStack Query
    return { id: result.id };
  });
}
