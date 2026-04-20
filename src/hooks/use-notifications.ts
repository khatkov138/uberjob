"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import Pusher from "pusher-js"
import { getPusherClient } from "@/lib/pusher-client";

interface NotificationData {
  senderId: string;
  orderId?: string;
}

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!userId) return

    const pusher = getPusherClient();

    const channelName = `user-notifications-${userId}`
    const channel = pusher.subscribe(channelName)

    // Функция-обработчик
    const handleNewMessage = (data: NotificationData) => {
      // 1. Обновляем глобальный счетчик (красная точка в навбаре)
      queryClient.invalidateQueries({ queryKey: ["unread-count"] })
      // 2. Обновляем список диалогов (последнее сообщение и синие кружки)
      queryClient.invalidateQueries({ queryKey: ["dialogs"] })
      // 3. РЕШАЕМ ТВОЙ БАГ: Инвалидируем кеш конкретного чата
      // Формируем такой же ключ, какой использует ChatWindow
      const specificChatKey = [
        "messages",
        data.orderId ? `order-${data.orderId}` : `user-${data.senderId}`
      ]
      // Помечаем данные этого чата как "протухшие"
      // Если чат закрыт — он обновится при открытии. Если открыт — рефетчнется сейчас.
      queryClient.invalidateQueries({ queryKey: specificChatKey })
    }
    // Подписываемся на событие
    channel.bind("new-unread-message", handleNewMessage)

    // --- ГРАМОТНАЯ ОТПИСКА ---
    return () => {
      // 1. Снимаем конкретный обработчик
      channel.unbind("new-unread-message", handleNewMessage)
      // 2. Отписываемся от канала
      pusher.unsubscribe(channelName)
      // 3. Полностью разрываем соединение (так как это глобальный хук, 
      // он создаст новое при смене userId или пересоздании)
    
    }
  }, [userId, queryClient])
}
