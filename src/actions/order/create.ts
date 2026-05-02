// src/actions/order/create.ts
"use server"

import prisma from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { createAuthAction } from "@/lib/server-utils"
import { analyzeTask } from "./lib/analyze"
import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"
import { getOrCreateLocation } from "@/actions/location/manage" // Импортируем наш умный экшен

/**
 * ГЛАВНЫЙ ЭКШЕН: Создание заказа ZWORK с привязкой к локации
 */
export async function createOrder(values: CreateOrderValues) {
  return createAuthAction(async (userId) => {

    // 1. Валидация входных данных
    const validated = createOrderSchema.parse(values);

    // 2. РАБОТА С ЛОКАЦИЕЙ (Новый этап)
    // Синхронизируем город в нашей БД и получаем его данные
    // Мы используем yandexUri из валидированных данных
    const locationRes = await getOrCreateLocation(validated.yandexUri, validated.address);
    
    // Находим ID локации в нашей БД (он нам нужен для связи в Prisma)
    const dbLocation = await prisma.location.findUnique({
      where: { yandexUri: validated.yandexUri },
      select: { id: true }
    });

    // 3. ИИ-Классификация задачи
    const aiResponse = await analyzeTask(validated.description);

    const aiCategories = aiResponse.categories?.length
      ? aiResponse.categories
      : [{ name: "Разное", keywords: [] }];

    // 4. Синхронизация категорий (Ниши)
    const categoryIds = await Promise.all(
      aiCategories.map(async (cat: any) => {
        const dbCategory = await prisma.category.upsert({
          where: { name: cat.name },
          update: { keywords: { set: cat.keywords || [] } },
          create: { name: cat.name, keywords: cat.keywords || [] },
          select: { id: true },
        });
        return dbCategory.id;
      })
    );

    // 5. ТРАНЗАКЦИЯ: Создание заказа и уведомлений
    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          title: aiResponse.title || validated.description.slice(0, 50),
          description: validated.description,
          // ВАЖНО: Мы убрали поле address из модели Order, 
          // теперь "правда" о городе лежит в locationId, а координаты в lat/lng
          price: Math.round(validated.price * 100),
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: validated.lat,
          lng: validated.lng,
          dateType: validated.dateType,
          
          // ПРИВЯЗКА К ЛОКАЦИИ: Связываем заказ с городом в нашей базе
          locationId: dbLocation?.id, 

          categories: {
            create: categoryIds.map((id) => ({
              categoryId: id,
            })),
          },
        },
        include: {
          categories: { include: { category: true } }
        }
      });

      // Поиск подходящих мастеров
      const matchingWorkers = await tx.profile.findMany({
        where: {
          skills: { some: { categoryId: { in: categoryIds } } },
          userId: { not: userId },
        },
        select: { userId: true },
      });

      // Создание системных уведомлений
      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `ZWORK: ${newOrder.title}`,
            message: `Новый заказ в вашей нише!`,
            type: "NEW_ORDER",
            link: `/order/${newOrder.id}`, // Исправили ссылку на /order/
          })),
        });
      }

      return { newOrder };
    });

    return { id: result.newOrder.id };
  });
}
