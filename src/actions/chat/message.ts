"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import Pusher from "pusher";
import { Message, User } from "../../../prisma/generated";
import { delay } from "@/lib/utils";
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
    await pusher.trigger(`user-notifications-${recipientId}`, "new-unread-message", {
        senderId: session.user.id, // Кто отправил
        orderId: orderId,       // В каком заказе (если есть)
    });


    return { success: true, data: message };
}

// Определяем тип сообщения с включенным отправителем
export type MessageWithSender = Message & {
    sender: Pick<User, "id" | "name">
}

export type InfiniteMessagesResponse = {
    messages: MessageWithSender[]
    nextCursor: string | null,
    totalUnread: number
}

export async function getMessages({
    recipientId,
    orderId,
    cursor,
    limit = 30
}: {
    recipientId: string,
    orderId?: string,
    cursor?: string,
    limit?: number,
}): Promise<InfiniteMessagesResponse> {

    const session = await getServerSession()
    if (!session?.user?.id) return { messages: [], nextCursor: null, totalUnread: 0 }

    const currentUserId = session.user.id

    const whereClause = orderId ? { orderId } : {
        OR: [
            { senderId: currentUserId, recipientId },
            { senderId: recipientId, recipientId: currentUserId }
        ]
    }

    // 1. Получаем сообщения
    const messages = await prisma.message.findMany({
        where: whereClause,
        take: limit,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, name: true } } }
    })

    // 2. Считаем ОБЩЕЕ количество непрочитанных мной в этом чате (БЕЗ ЛИМИТА 30)
    const totalUnread = await prisma.message.count({
        where: {
            senderId: recipientId,
            recipientId: currentUserId,
            isRead: false,
            ...(orderId && { orderId })
        }
    })

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

    return {
        messages,
        nextCursor,
        totalUnread // <-- Теперь мы знаем правду
    }
}
/**
 * 3. ПОЛУЧЕНИЕ СПИСКА ВСЕХ ДИАЛОГОВ (Inbox)
 * Используется на главной странице сообщений /messages
 */


// Тип одного диалога в списке
export interface ChatDialog {
    partner: {
        id: string;
        name: string;
        image: string | null;
    } | null;
    lastMessage: {
        id: string;
        text: string;
        senderId: string;
        recipientId: string;
        orderId: string | null;
        isRead: boolean;
        createdAt: Date;
    } | null;
    unreadCount: number;
}

export async function getUserDialogs(): Promise<ChatDialog[]> {
    const session = await getServerSession();
    if (!session?.user?.id) return [];

    const currentUserId = session.user.id;

    // 1. Находим всех, с кем была переписка
    const messages = await prisma.message.findMany({
        where: {
            OR: [{ senderId: currentUserId }, { recipientId: currentUserId }],
        },
        orderBy: { createdAt: "desc" },
    });

    const uniqueUserIds = Array.from(
        new Set(
            messages.map((m) => (m.senderId === currentUserId ? m.recipientId : m.senderId))
        )
    );

    // 2. Для каждого ID собираем инфо: последнее сообщение + кол-во непрочитанных
    const dialogs = await Promise.all(
        uniqueUserIds.map(async (partnerId) => {
            const partner = await prisma.user.findUnique({
                where: { id: partnerId },
                select: { id: true, name: true, image: true },
            });

            const lastMessage = await prisma.message.findFirst({
                where: {
                    OR: [
                        { senderId: currentUserId, recipientId: partnerId },
                        { senderId: partnerId, recipientId: currentUserId },
                    ],
                },
                orderBy: { createdAt: "desc" },
            });

            // Считаем только те, что прислали НАМ и которые мы еще не читали
            const unreadCount = await prisma.message.count({
                where: {
                    senderId: partnerId,
                    recipientId: currentUserId,
                    isRead: false,
                },
            });

            return {
                partner,
                lastMessage,
                unreadCount, // <--- Наша новая цифра
            };
        })
    );

    return dialogs;
}


export async function markMessagesAsRead(senderId: string, orderId?: string) {
    const session = await getServerSession();
    if (!session?.user?.id) return;

    const currentUserId = session.user.id;

    // 1. Обновляем в БД
    await prisma.message.updateMany({
        where: {
            senderId: senderId,       // Сообщения ОТ собеседника
            recipientId: currentUserId, // Предназначенные МНЕ
            isRead: false,
            ...(orderId && { orderId }) // Если в контексте заказа
        },
        data: { isRead: true }
    });

    // 2. Генерируем событие "прочитано" для отправителя через Pusher
    const channelName = orderId
        ? `chat-order-${orderId}`
        : `chat-user-${[currentUserId, senderId].sort().join('-')}`;

    await pusher.trigger(channelName, "messages-read", {
        readerId: currentUserId // Кто прочитал
    });
}

export async function getGlobalUnreadCount() {
    const session = await getServerSession();
    if (!session?.user?.id) return 0;

    return await prisma.message.count({
        where: {
            recipientId: session.user.id,
            isRead: false
        }
    });
}