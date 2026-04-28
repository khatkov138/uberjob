"use server"

import prisma from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { createAuthAction } from "@/lib/server-utils"
import { analyzeTask } from "./lib/analyze"
import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"

/**
 * ГЛАВНЫЙ ЭКШЕН: Создание заказа ZWORK
 */
export async function createOrder(values: CreateOrderValues) {
  // Обертка для проверки сессии (userId)
  return createAuthAction(async (userId) => {

    // 1. Валидация входных данных через Zod
    const validated = createOrderSchema.parse(values);

    // 2. ИИ-Классификация (Определяем title, ниши и keywords)
    // Функция analyzeTask возвращает: { title: string, categories: Array<{name, keywords}> }
    const aiResponse = await analyzeTask(validated.description);

    // ПРЕДОХРАНИТЕЛЬ: Если ИИ не вернул категории, создаем дефолтную
    const aiCategories = aiResponse.categories?.length
      ? aiResponse.categories
      : [{ name: "Разное", keywords: [] }];

    // 3. Синхронизация категорий (Upsert)
    // Создаем или получаем ID всех ниш, которые определил ИИ
    const categoryIds = await Promise.all(
      aiCategories.map(async (cat: any) => {
        const dbCategory = await prisma.category.upsert({
          where: { name: cat.name },
          update: {
            // Обновляем ключевые слова для улучшения поиска в будущем
            keywords: { set: cat.keywords || [] }
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

    // 4. ТРАНЗАКЦИЯ: Создание заказа и системных уведомлений
    const result = await prisma.$transaction(async (tx) => {
      // Создаем сам заказ
      const newOrder = await tx.order.create({
        data: {
          title: aiResponse.title || validated.description.slice(0, 50),
          description: validated.description,
          address: validated.address,
          // Сохраняем цену в копейках/центах
          price: Math.round(validated.price * 100),
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: validated.lat,
          lng: validated.lng,
          dateType: validated.dateType,
          // Связываем с категориями через промежуточную таблицу
          categories: {
            create: categoryIds.map((id) => ({
              categoryId: id,
            })),
          },
        },
        include: {
          client: {
            select: { name: true, image: true }
          },
          categories: {
            include: { category: true }
          }
        }
      });

      // Ищем профили мастеров, у которых есть эти скиллы (categoryId)
      const matchingWorkers = await tx.profile.findMany({
        where: {
          skills: {
            some: { categoryId: { in: categoryIds } },
          },
          userId: { not: userId }, // Не уведомляем автора заказа
        },
        select: { userId: true },
      });

      // Создаем уведомления в БД для ленты уведомлений
      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `ZWORK: ${newOrder.title}`,
            message: `Новый заказ в вашей нише!`,
            type: "NEW_ORDER",
            link: `/pro/orders/${newOrder.id}`,
          })),
        });
      }

      return { newOrder, workerIds: matchingWorkers.map(w => w.userId) };
    });

    /*   // 5. REAL-TIME: Пушим заказ в живую ленту через Pusher
       // Мастера на странице /pro/orders мгновенно увидят карточку
       try {
         await pusherServer.trigger("orders-feed", "new-order", {
           order: {
             ...result.newOrder,
             // Форматируем для соответствия типу FeedOrder на фронте
             offersCount: 0,
             clientStats: { projects: 1, hireRate: 0 } 
           },
           lat: validated.lat,
           lng: validated.lng
         });
       } catch (pusherError) {
         console.error("PUSHER_TRIGGER_ERROR:", pusherError);
         // Не кидаем ошибку здесь, чтобы заказ все равно считался созданным
       }
   */
    return { id: result.newOrder.id };
  });
}
