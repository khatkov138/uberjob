"use server"
import { createAuthAction } from "@/lib/server-utils";
import { CreateOrderValues } from "@/lib/validation";
import { analyzeTask } from "./lib/analyze";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export async function createOrder(formData: CreateOrderValues) {
  return createAuthAction(async (userId) => {
    // 1. ИИ определяет категории и заголовок
    const aiResponse = await analyzeTask(formData.description);

    // ПРЕДОХРАНИТЕЛЬ: Если ИИ вернул пустой массив, создаем дефолтную категорию
    const rawCategories = (aiResponse.categories && aiResponse.categories.length > 0)
      ? aiResponse.categories
      : [{ name: "Другое", keywords: ["общее"] }];

    // 2. Синхронизируем справочник категорий
    const categoryIds = await Promise.all(
      rawCategories.map(async (cat: any) => {
        const dbCategory = await prisma.category.upsert({
          where: { name: cat.name },
          update: {
            keywords: { set: cat.keywords || [] },
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
          // Гарантируем наличие заголовка
          title: aiResponse.title || formData.description.slice(0, 50),
          description: formData.description,
          address: formData.address,
          price: Math.round(Number(formData.price) * 100),
          status: OrderStatus.PENDING,
          clientId: userId,
          lat: formData.lat,
          lng: formData.lng,
          dateType: formData.dateType,
          categories: {
            // Исправлено: создание связей в промежуточной таблице
            create: categoryIds.map((id) => ({
              categoryId: id,
            })),
          },
        },
      });

      // 4. Поиск мастеров по навыкам (проверяем наличие профиля)
      const matchingWorkers = await tx.profile.findMany({
        where: {
          skills: {
            some: { categoryId: { in: categoryIds } },
          },
          userId: { not: userId }, // Не уведомляем самого себя
        },
        select: { userId: true },
      });

      // 5. Создание уведомлений в БД
      if (matchingWorkers.length > 0) {
        await tx.notification.createMany({
          data: matchingWorkers.map((worker) => ({
            userId: worker.userId,
            title: `Новый заказ: ${aiResponse.title || "ZWORK"}`,
            message: `Появилась работа в вашей категории.`,
            type: "NEW_ORDER",
            link: `/pro/orders/${newOrder.id}`,
          })),
        });
      }

      return { order: newOrder, workerIds: matchingWorkers.map(w => w.userId) };
    });

    // 6. ТУТ МЕСТО ДЛЯ PUSHER
    // Логика отправки в реальном времени должна быть здесь, 
    // чтобы не тормозить транзакцию БД.

    return { id: result.order.id };
  });
}
