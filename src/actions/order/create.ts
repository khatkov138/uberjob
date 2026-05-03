// src/actions/order/create.ts
"use server"

import prisma from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { createAuthAction } from "@/lib/server-utils"
import { analyzeTask } from "./lib/analyze"
import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"
import { getOrCreateLocation } from "@/actions/location/manage" // Импортируем наш умный экшен
import { slugify } from "@/lib/utils"

/**
 * ГЛАВНЫЙ ЭКШЕН: Создание заказа ZWORK с привязкой к локации
 */
import { nanoid } from "nanoid"; // Если нет nanoid, можно использовать Math.random

export async function createOrder(values: CreateOrderValues) {
  return createAuthAction(async (userId) => {

    // 1. Валидация
    const validated = createOrderSchema.parse(values);

    // 2. РАБОТА С ЛОКАЦИЕЙ
    await getOrCreateLocation(validated.yandexUri, validated.address);

    const dbLocation = await prisma.location.findUnique({
      where: { yandexUri: validated.yandexUri },
      select: { id: true, slug: true } // Обязательно берем slug города
    });

    // 3. ИИ-Классификация
    const aiResponse = await analyzeTask(validated.description);
    const aiCategories = aiResponse.categories?.length
      ? aiResponse.categories
      : [{ name: "Разное", keywords: [] }];

    // 4. Синхронизация категорий
    const categoryIds = await Promise.all(
      aiCategories.map(async (cat: any) => {
        const generatedSlug = slugify(cat.name);
        const dbCategory = await prisma.category.upsert({
          where: { slug: generatedSlug },
          update: { keywords: { set: cat.keywords || [] } },
          create: { name: cat.name, slug: generatedSlug, keywords: cat.keywords || [] },
          select: { id: true },
        });
        return dbCategory.id;
      })
    );

    // --- НОВОЕ: ГЕНЕРАЦИЯ СЛАГА ДЛЯ ЗАКАЗА ---
    const orderTitle = aiResponse.title || validated.description.slice(0, 50);
    const titlePart = slugify(orderTitle);
    const cityPart = dbLocation?.slug || "russia";
    const shortId = Math.random().toString(36).substring(2, 8); // генерим 6 символов
    const orderSlug = `${titlePart}-${cityPart}-${shortId}`;
    // -----------------------------------------

    // 5. ТРАНЗАКЦИЯ
    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          slug: orderSlug, // Сохраняем слаг
          title: orderTitle,
          description: validated.description,
          price: Math.round(validated.price * 100),
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: validated.lat,
          lng: validated.lng,
          dateType: validated.dateType,
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

      // Уведомления (теперь ведут на слаг)
      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `ZWORK: ${newOrder.title}`,
            message: `Новый заказ в вашей нише!`,
            type: "NEW_ORDER",
            link: `/order/${newOrder.slug}`, // Ведем на красивый URL
          })),
        });
      }

      return { newOrder };
    });

    // Возвращаем слаг для редиректа на клиенте
    return { id: result.newOrder.id, slug: result.newOrder.slug };
  });
}

