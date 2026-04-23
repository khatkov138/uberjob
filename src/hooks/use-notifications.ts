"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient, InfiniteData } from "@tanstack/react-query"
import { getPusherClient } from "@/lib/pusher-client"
import { ChatDialog, MessagesPage, PusherPayload } from "@/lib/types/chat"
import { Notification as DbNotification } from "../../prisma/generated"
import { getMessagesQueryKey } from "@/lib/utils"

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!userId) return

    const pusher = getPusherClient()
    const channelName = `user-${userId}`
    const channel = pusher.subscribe(channelName)

    // Слушаем единое событие "events" для всех типов уведомлений
    channel.bind("events", (payload: PusherPayload) => {
      const { type, contextKey, data } = payload

      // 1. НОВОЕ СООБЩЕНИЕ
      if (type === "NEW_MESSAGE") {
        const { message: msg, orderId } = data
        const isMe = msg.senderId === userId
        const queryKey = getMessagesQueryKey(contextKey)

        // Определяем, открыт ли этот чат прямо сейчас через URL
        const activeUserId = searchParams.get("userId")
        const activeOrderId = searchParams.get("orderId")

        const isCurrentChat = orderId
          ? activeOrderId === orderId
          : activeUserId === (isMe ? msg.recipientId : msg.senderId)

        // А) Обновляем бабблы в окне чата
        queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
          if (!old) {
            if (isCurrentChat) queryClient.invalidateQueries({ queryKey })
            return old
          }
          // Защита от дублей
          if (old.pages.flatMap(p => p.messages).some(m => m.id === msg.id)) return old

          return {
            ...old,
            pages: old.pages.map((page, index) => {
              if (index !== 0) return page
              // Убираем оптимистичное сообщение при замене реальным
              const filtered = page.messages.filter(m =>
                !(m.isOptimistic && m.senderId === msg.senderId && m.text === msg.text)
              )
              return { ...page, messages: [msg, ...filtered] }
            })
          }
        })

        // Б) Обновляем список диалогов (ChatList)
        queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
          if (!old) return old
          const dialogs = [...old]
          const partnerId = isMe ? msg.recipientId : msg.senderId

          const index = dialogs.findIndex(d =>
            orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId
          )

          if (index !== -1) {
            const [updated] = dialogs.splice(index, 1)
            return [{
              ...updated,
              lastMessage: msg,
              unreadCount: (!isMe && !isCurrentChat) ? updated.unreadCount + 1 : updated.unreadCount
            }, ...dialogs]
          }

          // Если диалога нет (новый контакт), просто перегружаем список
          queryClient.invalidateQueries({ queryKey: ["dialogs"] })
          return old
        })

        // В) Обновляем счетчик непрочитанных в Navbar
        if (!isCurrentChat && !isMe) {
          queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => ({
            count: (old?.count || 0) + 1
          }))
        }
      }

      // 2. ПОДТВЕРЖДЕНИЕ ПРОЧТЕНИЯ (Галочки)
      if (type === "MESSAGES_READ") {
        const queryKey = getMessagesQueryKey(contextKey);
        let countToReduce = 0;

        // А) Обнуляем unreadCount в списке диалогов и считаем, сколько сообщений "ушло"
        queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
          if (!old) return old;
          return old.map(d => {
            const isMatch = d.lastMessage?.orderId
              ? `order_${d.lastMessage.orderId}` === contextKey
              : `direct_${[userId, d.partner.id].sort().join('_')}` === contextKey;

            if (isMatch) {
              countToReduce = d.unreadCount; // Запоминаем, сколько было непрочитанных
              return { ...d, unreadCount: 0 };
            }
            return d;
          });
        });

        // Б) Вычитаем это количество из глобального баджа в Navbar
        if (countToReduce > 0) {
          queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => ({
            count: Math.max(0, (old?.count || 0) - countToReduce)
          }));
        }

        // В) Ставим галочки в самом окне чата (если оно открыто)
        queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              messages: page.messages.map(m =>
                // Если мы отправитель — ставим "прочитано", так как получили сигнал от получателя
                m.senderId === userId ? { ...m, isRead: true } : m
              )
            }))
          };
        });
      }

      // 3. СИСТЕМНЫЕ УВЕДОМЛЕНИЯ (Колокольчик)
      if (type === "SYSTEM_NOTIFICATION") {
        queryClient.setQueryData<DbNotification[]>(["notifications", userId], (old) => {
          const notification = data.notification
          if (old?.some(n => n.id === notification.id)) return old
          return [notification, ...(old || [])]
        })
      }
    })

    return () => {
      channel.unbind("events")
      pusher.unsubscribe(channelName)
    }
  }, [userId, queryClient, searchParams])
}
