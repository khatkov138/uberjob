// src/actions/order/create.ts
"use server"

import prisma from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"
import { createAuthAction } from "@/lib/server-utils"
import { analyzeTask } from "./lib/analyze"
import { createOrderSchema, type CreateOrderValues } from "@/lib/validation"
import { getOrCreateLocation } from "@/actions/location/manage" // Импортируем наш умный экшен
import { slugify, unwrap } from "@/lib/utils"
import { createId } from '@paralleldrive/cuid2';
/**
 * ГЛАВНЫЙ ЭКШЕН: Создание заказа ZWORK с привязкой к локации
 */
export async function createOrder(values: unknown) {
  return createAuthAction(async (userId) => {
    // 1. Валидация входных данных
    const validated = createOrderSchema.parse(values);

    // 2. Берем эталонную локацию из БД (она там уже 100% есть благодаря модалке)
    const dbLocation = await prisma.location.findUnique({
      where: { id: validated.locationId },
      select: { id: true, name: true, slug: true, lat: true, lng: true }
    });

    if (!dbLocation) throw new Error("Локация не найдена в базе");

    // 3. ИИ-Анализ описания (категории и заголовок)
    // Передаем dbLocation.name, чтобы ИИ мог учитывать контекст города
    const aiResponse = await analyzeTask(validated.description);

    const aiCategories = aiResponse.categories?.length
      ? aiResponse.categories
      : [{ name: "Разное", keywords: [] }];

    // 4. Синхронизация категорий (Upsert вне транзакции)
    const categoryIds = await Promise.all(
      aiCategories.map(async (cat: { name: string; keywords?: string[] }) => {
        const slug = slugify(cat.name);
        const dbCat = await prisma.category.upsert({
          where: { slug },
          update: { keywords: { set: cat.keywords || [] } },
          create: { name: cat.name, slug, keywords: cat.keywords || [] },
          select: { id: true },
        });
        return dbCat.id;
      })
    );

    // 5. Подготовка метаданных заказа
    const id = createId();
    const orderTitle = aiResponse.title || validated.description.slice(0, 50);
    // Слаг: заголовок + город + короткий ID
    const orderSlug = `${slugify(orderTitle)}-${dbLocation.slug}-${id.slice(0, 8)}`;

    // Координаты: уточненные пользователем или центр города по умолчанию
    const finalLat = validated.lat ?? dbLocation.lat;
    const finalLng = validated.lng ?? dbLocation.lng;

    // 6. ТРАНЗАКЦИЯ: Создание заказа и уведомления
    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          id,
          slug: orderSlug,
          title: orderTitle,
          description: validated.description,
          price: Math.round(validated.price * 100), // Копейки
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: finalLat,
          lng: finalLng,
          dateType: validated.dateType,
          scheduledDate: validated.scheduledDate,
          locationId: dbLocation.id,
          categories: {
            create: categoryIds.map((catId) => ({
              categoryId: catId,
            })),
          },
        },
      });

      // 7. Поиск мастеров для уведомлений
      const matchingWorkers = await tx.profile.findMany({
        where: {
          skills: { some: { categoryId: { in: categoryIds } } },
          userId: { not: userId },
        },
        select: { userId: true },
      });

      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `Новый заказ: ${newOrder.title}`,
            message: `В городе ${dbLocation.name} появилась работа для вас!`,
            type: "NEW_ORDER",
            link: `/order/${newOrder.slug}`,
          })),
        });
      }

      return newOrder;
    });

    // Возвращаем только слаг для редиректа. 
    // locationId в сторе уже обновлен клиентом в модалке.
    return { slug: result.slug };
  });
}
