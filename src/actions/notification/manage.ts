
"use server"

import { createAuthAction } from "@/lib/server-utils"
import prisma from "@/lib/prisma"

// Пометить конкретное уведомление как прочитанное
export async function markAsRead(id: string) {
    return createAuthAction(async (userId) => {
        await prisma.notification.update({
            where: {
                id,
                userId // Защита: только свои уведомления
            },
            data: { isRead: true }
        })

        return null
    })
}

// Пометить ВСЕ уведомления пользователя как прочитанные
export async function markAllAsRead() {
    return createAuthAction(async (userId) => {
        await prisma.notification.updateMany({
            where: {
                userId,
                isRead: false
            },
            data: { isRead: true }
        })

        return null
    })
}
