import prisma from "./prisma"

export async function createNotification({
    userId,
    title,
    message,
    type,
    link
}: {
    userId: string,
    title: string,
    message: string,
    type: 'ORDER_UPDATE' | 'REVIEW' | 'SYSTEM',
    link?: string
}) {
    // 1. Сохраняем в БД
    const notification = await prisma.notification.create({
        data: { userId, title, message, type, link }
    })

    // 2. Отправляем в Pusher (Real-time)
    // В 2026 можно использовать встроенные решения или сторонние SDK
    // Здесь мы имитируем вызов Pusher API
    console.log(`[REAL-TIME] Уведомление для ${userId}: ${title}`)

    return notification
}