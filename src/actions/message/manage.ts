"use server"

import prisma from "@/lib/prisma";
import { pusher } from "@/lib/pusher";
import { createAuthAction } from "@/lib/server-utils";
import { getContextKey } from "@/lib/utils";




export async function markMessagesAsRead(senderId: string, orderId?: string) {
    return createAuthAction(async (userId) => {
        await prisma.message.updateMany({
            where: {
                senderId: senderId,
                recipientId: userId,
                isRead: false,
                ...(orderId && { orderId })
            },
            data: { isRead: true }
        });

        const contextKey = getContextKey(orderId, userId, senderId);
        const payload = {
            type: "MESSAGES_READ",
            contextKey,
            data: { readerId: userId }
        };

        await Promise.all([
            pusher.trigger(`user-${senderId}`, "events", payload),
            pusher.trigger(`user-${userId}`, "events", payload)
        ]);

        return null;
    });
}

export async function sendTypingStatus(recipientId: string, orderId?: string) {
    return createAuthAction(async (userId) => {
        const contextKey = getContextKey(orderId, userId, recipientId);

        await pusher.trigger(`user-${recipientId}`, "events", {
            type: "USER_TYPING",
            contextKey,
            data: { senderId: userId }
        });

        return null;
    });
}

