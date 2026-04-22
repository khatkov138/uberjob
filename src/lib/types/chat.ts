
import { Message, Prisma } from "../../../prisma/generated"

// Сообщение с вложенным отправителем
export type MessageWithSender = Prisma.MessageGetPayload<{
  include: {
    sender: {
      select: { id: true; name: true; image: true }
    }
  }
}> & {
  // Добавляем наше UI-поле, чтобы TS перестал ругаться
  isOptimistic?: boolean 
}
// Структура страницы в InfiniteQuery
export interface MessagesPage {
  messages: MessageWithSender[]
  nextCursor?: string
}

export type InfiniteMessagesResponse = {
    messages: MessageWithSender[]
    nextCursor: string | null
    totalUnread: number
}

export interface ChatDialog {
  partner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  // Используем тип напрямую из Prisma, чтобы не было конфликтов
  lastMessage: Message | null; 
  unreadCount: number;
}
export type PusherPayload =
  | {
    type: "NEW_MESSAGE";
    data: {
      message: MessageWithSender;
      orderId: string | null;
      senderId: string;
    };
  }
  | {
    type: "SYSTEM_NOTIFICATION";
    data: {
      notification: any; // Пока оставим так или типизируем по аналогии
    };
  };