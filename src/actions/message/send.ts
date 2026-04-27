"use server"

import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"
import { sendMessageSchema, SendMessageValues } from "@/lib/validation"
import { getContextKey } from "@/lib/utils"

import { MessageWithSender } from "@/lib/types/chat"
import { pusher } from "@/lib/pusher"


export async function sendMessage(values: SendMessageValues) {
    return createAuthAction(async (userId): Promise<MessageWithSender> => {
        const { recipientId, text, orderId } = sendMessageSchema.parse(values);

        if (recipientId === userId) throw new Error("Cannot message yourself");

        // Спам-фильтр
        const lastMessage = await prisma.message.findFirst({
            where: { senderId: userId },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        });

        if (lastMessage && Date.now() - lastMessage.createdAt.getTime() < 500) {
            throw new Error("Slow down! Too many messages.");
        }

        const newMessage = await prisma.message.create({
            data: {
                text,
                senderId: userId,
                recipientId,
                orderId: orderId || null,
            },
            include: {
                sender: { select: { id: true, name: true, image: true } },
            },
        });

        // Pusher уведомление
        const contextKey = getContextKey(orderId || undefined, userId, recipientId);
        const payload = {
            type: "NEW_MESSAGE",
            contextKey,
            data: { message: newMessage, orderId: orderId || null, senderId: userId },
        };

        await Promise.all([
            pusher.trigger(`user-${recipientId}`, "events", payload),
            pusher.trigger(`user-${userId}`, "events", payload),
        ]);

        return newMessage;
    });
}