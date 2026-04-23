"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import Pusher from "pusher";
import { Message, User } from "../../../prisma/generated";
import { delay, getContextKey } from "@/lib/utils";
import { ChatDialog, InfiniteMessagesResponse, MessageWithSender, PusherPayload } from "@/lib/types/chat";
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

    // 1. Создаем сообщение в БД
    const newMessage = await prisma.message.create({
        data: {
            text,
            senderId: session.user.id,
            recipientId,
            orderId: orderId || null,
        },
        include: {
            sender: {
                select: { id: true, name: true, image: true }
            }
        }
    });

    // 2. Генерируем универсальный ключ контекста для фронтенда
    const contextKey = getContextKey(orderId, session.user.id, recipientId);

    // 3. Формируем единый Payload по новому типу PusherPayload
    const payload: PusherPayload = {
        type: "NEW_MESSAGE",
        contextKey: contextKey,
        data: {
            message: newMessage,
            orderId: orderId || null,
            senderId: session.user.id,
        }
    };

    // 4. Отправляем всего в два персональных канала
    // Это обновит и чат, и список диалогов, и счетчики у обоих участников
    await Promise.all([
        // Получателю
        pusher.trigger(`user-${recipientId}`, "events", payload),
        // Себе (для синхронизации вкладок)
        pusher.trigger(`user-${session.user.id}`, "events", payload)
    ]);

    return { success: true, data: newMessage };
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
    const normalizedOrderId = orderId || null

    const whereClause = normalizedOrderId
        ? { orderId: normalizedOrderId }
        : {
            OR: [
                { senderId: currentUserId, recipientId },
                { senderId: recipientId, recipientId: currentUserId }
            ],
            orderId: null
        }

    // 1. Получаем сообщения
    // Prisma автоматически типизирует это как массив объектов, 
    // соответствующих схеме БД + нашему include
    const messages = await prisma.message.findMany({
        where: whereClause,
        take: limit,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        orderBy: { createdAt: 'desc' },
        include: {
            sender: {
                // Важно: берем те же поля, что в типе MessageWithSender
                select: { id: true, name: true, image: true }
            }
        }
    })

    // 2. Считаем непрочитанные
    const totalUnread = await prisma.message.count({
        where: {
            senderId: recipientId,
            recipientId: currentUserId,
            isRead: false,
            orderId: normalizedOrderId
        }
    })

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

    return {
        messages, // Теперь TS пропустит это без 'as', так как структура совпадает 1-в-1
        nextCursor,
        totalUnread
    }
}


export async function getUserDialogs(): Promise<ChatDialog[]> {
    const session = await getServerSession();
    if (!session?.user?.id) return [];

    const currentUserId = session.user.id;

    const messages = await prisma.message.findMany({
        where: {
            OR: [{ senderId: currentUserId }, { recipientId: currentUserId }],
        },
        select: { senderId: true, recipientId: true },
        orderBy: { createdAt: "desc" },
    });

    const uniqueUserIds = Array.from(
        new Set(messages.map((m) => (m.senderId === currentUserId ? m.recipientId : m.senderId)))
    );

    const dialogs = await Promise.all(
        uniqueUserIds.map(async (partnerId): Promise<ChatDialog | null> => {
            const [partner, lastMessage, unreadCount] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: partnerId },
                    select: { id: true, name: true, image: true },
                }),
                prisma.message.findFirst({
                    where: {
                        OR: [
                            { senderId: currentUserId, recipientId: partnerId },
                            { senderId: partnerId, recipientId: currentUserId },
                        ],
                    },
                    orderBy: { createdAt: "desc" },
                    // ДОБАВЛЯЕМ INCLUDE ЗДЕСЬ:
                    include: {
                        sender: {
                            select: { id: true, name: true, image: true }
                        }
                    }
                }),
                prisma.message.count({
                    where: {
                        senderId: partnerId,
                        recipientId: currentUserId,
                        isRead: false,
                    },
                })
            ]);

            if (!partner) return null;

            return {
                partner,
                lastMessage: lastMessage as MessageWithSender | null, // Принудительно кастим, так как Prisma возвращает нужный нам Payload
                unreadCount,
            };
        })
    );

    return dialogs.filter((d): d is ChatDialog => d !== null);
}



export async function markMessagesAsRead(senderId: string, orderId?: string) {
    const session = await getServerSession();
    if (!session?.user?.id) return;

    const currentUserId = session.user.id;

    try {
        // 1. Обновляем статус в базе данных
        await prisma.message.updateMany({
            where: {
                senderId: senderId,
                recipientId: currentUserId,
                isRead: false,
                ...(orderId && { orderId })
            },
            data: { isRead: true }
        });

        // 2. Генерируем универсальный ключ контекста (order_ID или direct_ID_ID)
        const contextKey = getContextKey(orderId, currentUserId, senderId);

        // 3. Формируем Payload по нашему новому стандарту
        const payload: PusherPayload = {
            type: "MESSAGES_READ",
            contextKey: contextKey,
            data: {
                readerId: currentUserId // Кто именно прочитал
            }
        };

        // 4. Рассылаем уведомление через персональные каналы
        await Promise.all([
            // Отправляем ОТПРАВИТЕЛЮ (чтобы он увидел галочки у себя)
            pusher.trigger(`user-${senderId}`, "events", payload),

            // Отправляем СЕБЕ (чтобы синхронизировать счетчики во всех своих вкладках)
            pusher.trigger(`user-${currentUserId}`, "events", payload)
        ]);

    } catch (error) {
        console.error("MARK_READ_ERROR:", error);
    }
}

export async function sendTypingStatus(recipientId: string, contextKey: string) {
    const session = await getServerSession();
    if (!session?.user?.id) return;

    const payload: PusherPayload = {
        type: "USER_TYPING",
        contextKey: contextKey,
        data: {
            userId: session.user.id
        }
    };

    // Отправляем событие ТОЛЬКО получателю. 
    // Себе слать не обязательно, так как мы и так знаем, что печатаем, 
    // а Broadcast во второй вкладке это увидит через локальный стейт, если нужно.
    await pusher.trigger(`user-${recipientId}`, "events", payload);
}

