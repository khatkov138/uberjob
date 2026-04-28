// app/actions/review/create.ts
"use server"

import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"
import { reviewSchema } from "@/lib/validation"

export async function leaveReviewAction(values: unknown) {
  return createAuthAction(async (userId) => {
    // 1. Валидация (Zod выбросит ошибку, если данные кривые)
    const validated = reviewSchema.parse(values);

    // Вся работа с БД в одной транзакции
    return await prisma.$transaction(async (tx) => {
      
      // 2. Ищем заказ и сразу достаем workerId мастера
      // Важно: проверяем, что именно этот userId (клиент) создал этот заказ
      const order = await tx.order.findFirst({
        where: {
          id: validated.orderId,
          clientId: userId,
          status: "COMPLETED",
        },
        select: {
          id: true,
          workerId: true, // Нам нужен userId мастера для уведомления
          worker: { // Нам нужен ID профиля для связи с отзывом
            select: {
              profile: { select: { id: true } }
            }
          }
        }
      });

      if (!order || !order.worker?.profile?.id) {
        throw new Error("Заказ не найден, не завершен или у него нет исполнителя");
      }

      const profileId = order.worker.profile.id;

      // 3. Проверка лимита редактирования (7 дней)
      const existing = await tx.review.findUnique({
        where: { orderId: validated.orderId }
      });

      if (existing) {
        const diffDays = (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) throw new Error("Срок редактирования (7 дней) истек");
      }

      // 4. Сохраняем/обновляем отзыв
      const review = await tx.review.upsert({
        where: { orderId: validated.orderId },
        update: {
          rating: validated.rating,
          comment: validated.comment
        },
        create: {
          rating: validated.rating,
          comment: validated.comment,
          orderId: validated.orderId,
          profileId: profileId, // Исполнителя определил сервер, а не фронт!
        },
      });

      // 5. Пересчитываем средний рейтинг в профиле мастера
      const stats = await tx.review.aggregate({
        where: { profileId: profileId },
        _avg: { rating: true },
      });

      await tx.profile.update({
        where: { id: profileId },
        data: { rating: stats._avg.rating || 5.0 },
      });

      // 6. Уведомление мастеру (используем order.workerId)
      if (order.workerId) {
        await tx.notification.create({
          data: {
            userId: order.workerId,
            title: existing ? "Отзыв обновлен ⭐" : "Новый отзыв! ⭐",
            message: `Клиент оценил вашу работу на ${validated.rating} звезд`,
            type: "REVIEW",
            link: `/pro/orders/${order.id}`
          }
        });
      }

      return review;
    });
  });
}
