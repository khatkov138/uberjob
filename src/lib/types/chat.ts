
import { Message, Notification, Prisma } from "../../../prisma/generated"

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
    contextKey: string; // Формат: "order_ID" или "direct_USERID1_USERID2"
    data: {
      message: MessageWithSender;
      orderId?: string | null;
      senderId: string;
    };
  }

  | {
    type: "MESSAGES_READ";
    contextKey: string;
    data: {
      readerId: string; // Кто прочитал сообщения
    };
  }
  | {
    type: "ORDER_UPDATE";
    contextKey: string; // Формат: "order_ID"
    data: {
      orderId: string;
      status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      price?: number;
    };
  }

  | {
    type: "SYSTEM_NOTIFICATION";
    contextKey: "global";
    data: {
      notification: Notification;
    };
  }
  | {
    type: "AI_CATEGORY_SUGGESTION"; // Твое УТП: быстрый подбор категории
    contextKey: "ai_suggestion";
    data: {
      categoryId: string;
      categoryName: string;
      confidence: number; // Насколько ИИ уверен (0-1)
      suggestedTitle: string; // Текст, который ИИ выделил как заголовок
    };
  };
