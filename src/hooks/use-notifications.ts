"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient, InfiniteData } from "@tanstack/react-query"
import { getPusherClient } from "@/lib/pusher-client"
import { ChatDialog, InfiniteMessagesResponse, PusherPayload } from "@/lib/types/chat"
import { getMessagesQueryKey, getContextKey } from "@/lib/utils"

const typingTimeouts: Record<string, NodeJS.Timeout> = {};

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!userId) return

    const pusher = getPusherClient()
    const channelName = `user-${userId}`
    const channel = pusher.subscribe(channelName)

    channel.bind("events", (payload: PusherPayload) => {
      const { type, contextKey, data } = payload
      if (!contextKey) return

      // 1. СТАТУС ПЕЧАТИ
      if (type === "USER_TYPING") {
        if (typingTimeouts[contextKey]) clearTimeout(typingTimeouts[contextKey]);
        queryClient.setQueryData(["typing", contextKey], { isTyping: true, userId: data.userId });
        typingTimeouts[contextKey] = setTimeout(() => {
          queryClient.setQueryData(["typing", contextKey], { isTyping: false });
        }, 4000);
      }

      // 2. НОВОЕ СООБЩЕНИЕ
      if (type === "NEW_MESSAGE") {
        const { message: msg, orderId } = data
        const isMe = msg.senderId === userId
        const queryKey = getMessagesQueryKey(contextKey)

        const activeUserId = searchParams.get("userId")
        const activeOrderId = searchParams.get("orderId")

        // Вкладка считается "в чате", только если URL совпадает И окно активно
        const isChatRoute = orderId ? activeOrderId === orderId : activeUserId === (isMe ? msg.recipientId : msg.senderId);
        const isCurrentChat = isChatRoute && document.hasFocus();

        queryClient.setQueryData(["typing", contextKey], { isTyping: false });

        // А) Обновление бабблов (Infinite Query)
        queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
          if (!old) return isChatRoute ? (queryClient.invalidateQueries({ queryKey }), old) : old

          if (old.pages.flatMap(p => p.messages).some(m => m.id === msg.id)) return old

          // Создаем копию сообщения для кэша
          const newMsg = { ...msg };

          // Если чат открыт прямо сейчас и окно в фокусе, 
          // мы визуально помечаем сообщение как прочитанное сразу
          if (isCurrentChat && !isMe) {
            newMsg.isRead = true;
          }

          return {
            ...old,
            pages: old.pages.map((page, i) => i !== 0 ? page : {
              ...page,
              messages: [newMsg, ...page.messages.filter(m => !(m.isOptimistic && m.text === msg.text))]
            })
          }
        })

        // Б) Обновление списка диалогов (Sidebar)
        let shouldIncrementNavbar = false
        queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
          if (!old) return old
          const dialogs = [...old]
          const partnerId = isMe ? msg.recipientId : msg.senderId
          const index = dialogs.findIndex(d => orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId)

          if (index !== -1) {
            const existing = dialogs[index]

            // Если пришло подтверждение нашего оптимистичного сообщения
            const isOptimisticConfirm = isMe && existing.lastMessage?.isOptimistic && existing.lastMessage?.text === msg.text;

            // Если сообщение уже обработано (те же ID)
            if (existing.lastMessage?.id === msg.id) return old

            if (isOptimisticConfirm) {
              // Просто тихо обновляем последнее сообщение без перемещений и счетчиков
              const updated = [...dialogs]
              updated[index] = { ...existing, lastMessage: msg }
              return updated
            }

            // РЕАЛЬНО НОВОЕ СООБЩЕНИЕ
            const [moved] = dialogs.splice(index, 1)

            let newUnreadCount = moved.unreadCount
            if (isCurrentChat) {
              newUnreadCount = 0
            } else if (!isMe) {
              newUnreadCount += 1
              shouldIncrementNavbar = true
            }

            return [{ ...moved, lastMessage: msg, unreadCount: newUnreadCount }, ...dialogs]
          }

          // Если диалога нет (новый контакт) - рефетчим список
          queryClient.invalidateQueries({ queryKey: ["dialogs"] });
          return old
        })

        if (shouldIncrementNavbar) {
          queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => ({ count: (old?.count || 0) + 1 }))
        }
      }

      // 3. ПРОЧТЕНИЕ
      if (type === "MESSAGES_READ") {
        const queryKey = getMessagesQueryKey(contextKey)
        const isReadByMe = data.readerId === userId

        queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
          if (!old) return old
          return { ...old, pages: old.pages.map(p => ({ ...p, messages: p.messages.map(m => (isReadByMe ? m.senderId !== userId : m.senderId === userId) ? { ...m, isRead: true } : m) })) }
        })

        queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => old?.map(d => {
          const match = d.lastMessage?.orderId ? `order_${d.lastMessage.orderId}` === contextKey : getContextKey(null, userId, d.partner.id) === contextKey
          return match ? { ...d, unreadCount: 0 } : d
        }))

        if (isReadByMe) queryClient.invalidateQueries({ queryKey: ["unread-count"] })
      }
    })

    return () => {
      channel.unbind("events")
      pusher.unsubscribe(channelName)
      Object.values(typingTimeouts).forEach(clearTimeout)
    }
  }, [userId, queryClient, searchParams])
}
