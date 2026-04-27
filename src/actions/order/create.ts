"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { CreateOrderValues } from "@/lib/validation"
import { OrderStatus } from "@prisma/client"
import { createAuthAction } from "@/lib/server-utils"
import { analyzeTask } from "./lib/analyze"



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
