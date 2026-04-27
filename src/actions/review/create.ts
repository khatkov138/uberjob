"use server"

import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"
import { reviewSchema } from "@/lib/validation" // Путь к схеме

export async function leaveReviewAction(values: unknown) {
    return createAuthAction(async (userId) => {
        // 1. Валидация входных данных через Zod
        const validated = reviewSchema.parse(values);

        const result = await prisma.$transaction(async (tx) => {
            // 2. БЕЗОПАСНОСТЬ: Только владелец завершенного заказа может оставить отзыв
            const order = await tx.order.findFirst({
                where: {
                    id: validated.orderId,
                    clientId: userId,
                    status: "COMPLETED"
                }
            })

            if (!order) {
                throw new Error("Заказ не найден или не завершен")
            }

            // 3. Проверка лимита редактирования (7 дней)
            const existing = await tx.review.findUnique({
                where: { orderId: validated.orderId }
            })

            if (existing) {
                const diffDays = (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24)
                if (diffDays > 7) throw new Error("Срок редактирования (7 дней) истек")
            }

            // 4. Upsert отзыва
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
                    profileId: validated.profileId,
                },
            })

            // 5. Пересчет рейтинга профиля мастера
            const stats = await tx.review.aggregate({
                where: { profileId: validated.profileId },
                _avg: { rating: true },
            })

            await tx.profile.update({
                where: { id: validated.profileId },
                data: { rating: stats._avg.rating || 5.0 },
            })

            // 6. Уведомление мастеру
            if (order.workerId) {
                await tx.notification.create({
                    data: {
                        userId: order.workerId,
                        title: existing ? "Отзыв обновлен ⭐" : "Новый отзыв! ⭐",
                        message: `Клиент оценил вашу работу на ${validated.rating} звезд`,
                        type: "REVIEW",
                        link: `/pro/orders/${order.id}`
                    }
                })
            }

            return review
        })

        return result
    })
}
