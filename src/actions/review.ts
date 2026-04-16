
"use server"
import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function leaveReviewAction(formData: {
    orderId: string
    profileId: string
    rating: number
    comment: string
}) {
    const session = await getServerSession()
    if (!session?.user) return { success: false, error: "Авторизуйтесь" }

    try {
        return await prisma.$transaction(async (tx) => {
            // 1. БЕЗОПАСНОСТЬ: Проверяем, что заказ принадлежит клиенту и завершен
            const order = await tx.order.findFirst({
                where: {
                    id: formData.orderId,
                    clientId: session.user.id,
                    status: "COMPLETED"
                },
                include: { worker: true } // берем workerId для уведомления
            })

            if (!order) {
                throw new Error("Заказ не найден или еще не завершен")
            }

            // 2. Проверка времени редактирования (7 дней)
            const existing = await tx.review.findUnique({
                where: { orderId: formData.orderId }
            })

            if (existing) {
                const diffDays = (Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24)
                if (diffDays > 7) throw new Error("Срок редактирования (7 дней) истек")
            }

            // 3. Сохраняем/Обновляем отзыв
            await tx.review.upsert({
                where: { orderId: formData.orderId },
                update: { rating: formData.rating, comment: formData.comment },
                create: {
                    rating: formData.rating,
                    comment: formData.comment,
                    orderId: formData.orderId,
                    profileId: formData.profileId,
                },
            })

            // 4. Пересчитываем рейтинг мастера
            const stats = await tx.review.aggregate({
                where: { profileId: formData.profileId },
                _avg: { rating: true },
            })

            await tx.profile.update({
                where: { id: formData.profileId },
                data: { rating: stats._avg.rating || 5.0 },
            })

            // 5. СОЗДАЕМ УВЕДОМЛЕНИЕ ДЛЯ МАСТЕРА
            if (order.workerId) {
                await tx.notification.create({
                    data: {
                        userId: order.workerId,
                        title: existing ? "Отзыв обновлен ⭐" : "Новый отзыв! ⭐",
                        message: `Клиент оценил вашу работу на ${formData.rating} звезд`,
                        type: "REVIEW",
                        link: `/pro/orders/${order.id}`
                    }
                })
            }

            revalidatePath(`/client/orders/${formData.orderId}`)
            return { success: true, error: null }
        })
    } catch (error: any) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Произошла ошибка"
        }
    }
}