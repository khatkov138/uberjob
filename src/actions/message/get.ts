"use server"

import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"
import { ChatDialog, InfiniteMessagesResponse, MessageWithSender } from "@/lib/types/chat"

/**
 * Получение истории сообщений (пагинация)
 */
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
}) {
    return createAuthAction(async (userId): Promise<InfiniteMessagesResponse> => {
        const normalizedOrderId = orderId || null;

        const whereClause = normalizedOrderId
            ? { orderId: normalizedOrderId }
            : {
                OR: [
                    { senderId: userId, recipientId },
                    { senderId: recipientId, recipientId: userId }
                ],
                orderId: null
            };

        const messages = await prisma.message.findMany({
            where: whereClause,
            take: limit,
            ...(cursor && { skip: 1, cursor: { id: cursor } }),
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, name: true, image: true } }
            }
        });

        const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

        return {
            messages: messages,
            nextCursor,
        };
    });
}

/**
 * Получение списка всех диалогов пользователя
 */
export async function getUserDialogs() {
    return createAuthAction(async (userId) => {

        const messages = await prisma.message.findMany({
            where: {
                OR: [{ senderId: userId }, { recipientId: userId }],
            },
            select: { senderId: true, recipientId: true },
            orderBy: { createdAt: "desc" },
        });

        const uniqueUserIds = Array.from(
            new Set(messages.map((m) => (m.senderId === userId ? m.recipientId : m.senderId)))
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
                                { senderId: userId, recipientId: partnerId },
                                { senderId: partnerId, recipientId: userId },
                            ],
                        },
                        orderBy: { createdAt: "desc" },
                        include: {
                            sender: { select: { id: true, name: true, image: true } }
                        }
                    }),
                    prisma.message.count({
                        where: {
                            senderId: partnerId,
                            recipientId: userId,
                            isRead: false,
                        },
                    })
                ]);

                if (!partner) return null;

                return {
                    partner,
                    lastMessage: lastMessage as MessageWithSender | null,
                    unreadCount,
                };
            })
        );

        return dialogs.filter((d): d is ChatDialog => d !== null);
    });
}