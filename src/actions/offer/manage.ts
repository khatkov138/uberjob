"use server"

import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"

// КЛИЕНТ: Принять отклик мастера
export async function acceptOffer(orderId: string, offerId: string) {
    // Убрали workerId из аргументов — это безопаснее
    return createAuthAction(async (userId) => {

        return await prisma.$transaction(async (tx) => {
            // 1. Проверяем заказ и оффер ОДНИМ запросом
            const offer = await tx.offer.findFirst({
                where: {
                    id: offerId,
                    orderId: orderId,
                    order: { clientId: userId } // Проверка владения заказом
                },
                select: { workerId: true }
            })

            if (!offer) throw new Error("Оффер не найден или у вас нет прав")

            // 2. Обновляем статус заказа и назначаем мастера
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: "ACCEPTED",
                    workerId: offer.workerId // Берем ID из БД, а не с фронта
                }
            })

            // 3. Принимаем этот оффер
            await tx.offer.update({
                where: { id: offerId },
                data: { status: "ACCEPTED" }
            })

            // 4. Отклоняем остальные
            await tx.offer.updateMany({
                where: {
                    orderId,
                    id: { not: offerId }
                },
                data: { status: "REJECTED" }
            })

            return updatedOrder
        })
    })
}