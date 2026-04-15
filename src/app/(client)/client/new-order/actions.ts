"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { CreateOrderValues } from "@/lib/validation"
import { OrderStatus } from "../../../../../prisma/generated"

async function getRelevantContext(description: string) {
  const searchTerms = description
    .toLowerCase()
    .replace(/[^а-яёa-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3)
    .map(word => word.slice(0, 5));

  if (searchTerms.length === 0) return [];

  return await prisma.category.findMany({
    where: {
      OR: [
        { name: { in: searchTerms } },
        { keywords: { hasSome: searchTerms } }
      ]
    },
    take: 15,
    select: { name: true, keywords: true }
  });
}

async function analyzeTask(description: string) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY_MISSING");

    const relevantCategories = await getRelevantContext(description);
    // Передаем ИИ информацию о том, у каких категорий нет ключей
    const dbContext = relevantCategories.map(c => 
      `- ${c.name} ${c.keywords.length > 0 ? '(ключи есть)' : '(НУЖНЫ КЛЮЧИ)'}`
    ).join("\n");

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
            content: `Ты — диспетчер Uberjob. Твоя задача: подобрать категории (макс. 5).
            
            КОНТЕКСТ ИЗ БАЗЫ:
            ${dbContext || "База пуста"}
            
            ЭТАЛОНЫ:
            - Замки -> "Вскрытие замков"
            - Уборка -> "Клининг"
            - Септики -> "Ассенизация"
            - Свет -> "Электрика"
            - Трубы -> "Сантехника"
            
            ИНСТРУКЦИЯ:
            1. Если в КОНТЕКСТЕ ИЗ БАЗЫ у категории пометка (НУЖНЫ КЛЮЧИ), ты ОБЯЗАН сгенерировать их.
            2. Keywords — это массив из 7-10 существительных в начальной форме.
            3. Названия категорий — простые (1-2 слова).
            
            Формат JSON:
            {
              "title": "заголовок",
              "categories": [
                { "name": "Название", "keywords": ["слово1", "слово2"] }
              ]
            }`
          },
          { role: "user", content: description }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error(`Groq error: ${response.status}`);

    const result = await response.json();
    // Исправленный путь к контенту (у Groq это choices[0].message.content)
    const rawContent = result.choices[0]?.message?.content;
    return JSON.parse(rawContent.replace(/```json|```/g, "").trim());

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
    const aiResponse = await analyzeTask(formData.description);
    const categoryNames = aiResponse.categories.map((c: any) => c.name);

    // 2. Обновленная регистрация категорий
    await Promise.all(
      aiResponse.categories.map(async (cat: any) => {
        // Проверяем, есть ли категория и пустые ли у нее ключи
        const existing = await prisma.category.findUnique({ where: { name: cat.name } });
        
        const shouldUpdateKeywords = !existing || (existing.keywords.length === 0 && cat.keywords?.length > 0);

        return prisma.category.upsert({
          where: { name: cat.name },
          update: {
            // Обновляем только если в базе пусто, чтобы не перезаписывать ручные правки
            keywords: shouldUpdateKeywords ? { set: cat.keywords } : undefined
          },
          create: {
            name: cat.name,
            keywords: cat.keywords || []
          }
        });
      })
    );

    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          title: aiResponse.title,
          description: formData.description,
          address: formData.address,
          price: formData.price * 100,
          categories: categoryNames,
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: formData.lat,
          lng: formData.lng,
          dateType: formData.dateType,
        },
      });

      const matchingWorkers = await tx.profile.findMany({
        where: {
          skills: { hasSome: categoryNames },
          userId: { not: userId }
        },
        select: { userId: true }
      });

      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `${categoryNames[0]}${categoryNames.length > 1 ? ' +' : ''} 🚀`,
            message: `${aiResponse.title}. Предложите цену!`,
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
    console.error("CRITICAL_ORDER_ERROR:", error);
    return { success: false, error: "Ошибка публикации." };
  }
}
