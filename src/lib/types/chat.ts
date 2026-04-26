import { Prisma } from "@prisma/client";

export type MessageWithSender = Prisma.MessageGetPayload<{
  include: {
    sender: { select: { id: true; name: true; image: true } }
  }
}> & {
  isOptimistic?: boolean
  updatedAt?: Date;
};

export interface InfiniteMessagesResponse {
  messages: MessageWithSender[];
  nextCursor: string | null;
}

export interface ChatDialog {
  partner: { id: string; name: string | null; image: string | null };
  lastMessage: MessageWithSender | null;
  unreadCount: number;
}

export type PusherPayload =

  | { type: "NEW_MESSAGE"; contextKey: string; data: { message: MessageWithSender; orderId?: string | null; senderId: string } }
  | { type: "MESSAGES_READ"; contextKey: string; data: { readerId: string } }

  | { type: "USER_TYPING"; contextKey: string; data: { userId: string } }
  | { type: "SYSTEM_NOTIFICATION"; contextKey: string; data: { notification: Notification } };
