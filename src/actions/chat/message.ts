"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import Pusher from "pusher";
/**
 * 1. ОТПРАВКА СООБЩЕНИЯ
 * Универсальная функция: привязывает заказ, если передан orderId
 */
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function sendMessage({ recipientId, text, orderId }: { recipientId: string, text: string, orderId?: string }) {
    const session = await getServerSession();
    if (!session?.user?.id) return { success: false };

    // 1. Сохраняем в БД
    const message = await prisma.message.create({
        data: {
            text,
            senderId: session.user.id,
            recipientId,
            orderId: orderId || null,
        },
        include: { sender: { select: { name: true } } }
    });

    // 2. Публикуем событие в Pusher
    // Название канала: уникальное для пары пользователей или заказа
    const channelName = orderId 
        ? `chat-order-${orderId}` 
        : `chat-user-${[session.user.id, recipientId].sort().join('-')}`;

    await pusher.trigger(channelName, "new-message", message);

    return { success: true, data: message };
}

/**
 * 2. ПОЛУЧЕНИЕ СООБЩЕНИЙ ПО ЗАКАЗУ
 * Используется в виджете на странице заказа
 */
export async function getOrderMessages(orderId: string) {
    const session = await getServerSession()
    if (!session?.user?.id) return []

    return await prisma.message.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
        include: {
            sender: { select: { name: true, id: true } }
        }
    })
}

/**
 * 3. ПОЛУЧЕНИЕ СПИСКА ВСЕХ ДИАЛОГОВ (Inbox)
 * Используется на главной странице сообщений /messages
 */
export async function getUserDialogs() {
    const session = await getServerSession()
    if (!session?.user?.id) return []

    const userId = session.user.id

    // 1. Находим все уникальные ID людей, с которыми мы переписывались
    // Мы берем только senderId и recipientId, это очень легкий запрос
    const participants = await prisma.message.findMany({
        where: {
            OR: [{ senderId: userId }, { recipientId: userId }]
        },
        select: { senderId: true, recipientId: true },
        orderBy: { createdAt: 'desc' },
    })

    // 2. Формируем список уникальных ID собеседников
    const otherUserIds = Array.from(new Set(
        participants.map(m => m.senderId === userId ? m.recipientId : m.senderId)
    ))

    // 3. Для каждого собеседника тянем ТОЛЬКО ОДНО последнее сообщение
    // Используем Promise.all для параллельного выполнения
    const dialogs = await Promise.all(
        otherUserIds.map(async (otherId) => {
            return await prisma.message.findFirst({
                where: {
                    OR: [
                        { senderId: userId, recipientId: otherId },
                        { senderId: otherId, recipientId: userId }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    sender: { select: { id: true, name: true } },
                    recipient: { select: { id: true, name: true } },
                    order: { select: { id: true, title: true } }
                }
            })
        })
    )

    // 4. Фильтруем пустые и сортируем по дате (самые свежие наверху)
    return dialogs
        .filter(Boolean)
        .map(msg => ({
            id: msg!.id,
            lastMessage: msg!.text,
            createdAt: msg!.createdAt,
            otherUser: msg!.senderId === userId ? msg!.recipient : msg!.sender,
            orderId: msg!.orderId,
            orderTitle: msg!.order?.title
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
