"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient, InfiniteData } from "@tanstack/react-query"
import { getPusherClient } from "@/lib/pusher-client"
import { ChatDialog, MessagesPage, PusherPayload } from "@/lib/types/chat"
import { Notification as DbNotification } from "../../prisma/generated"
import { getMessagesQueryKey, getContextKey } from "@/lib/utils"

// Храним ID таймеров вне хука, чтобы они выживали между ререндерами
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

      // 1. СТАТУС "ПЕЧАТАЕТ..."
      if (type === "USER_TYPING") {
        if (typingTimeouts[contextKey]) clearTimeout(typingTimeouts[contextKey]);

        // Сохраняем не просто true, а ID или данные пользователя
        queryClient.setQueryData(["typing", contextKey], {
          isTyping: true,
          userId: data.userId
        });

        typingTimeouts[contextKey] = setTimeout(() => {
          queryClient.setQueryData(["typing", contextKey], { isTyping: false });
          delete typingTimeouts[contextKey];
        }, 4000);
      }

      // 2. НОВОЕ СООБЩЕНИЕ
      if (type === "NEW_MESSAGE") {
        const { message: msg, orderId } = data
        const isMe = msg.senderId === userId
        const queryKey = getMessagesQueryKey(contextKey)
        const isCurrentChat = orderId
          ? searchParams.get("orderId") === orderId
          : searchParams.get("userId") === (isMe ? msg.recipientId : msg.senderId)

        // Сразу убираем статус "печатает", раз сообщение пришло
        queryClient.setQueryData(["typing", contextKey], false);
        if (typingTimeouts[contextKey]) {
          clearTimeout(typingTimeouts[contextKey]);
          delete typingTimeouts[contextKey];
        }

        queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
          if (!old) return isCurrentChat ? (queryClient.invalidateQueries({ queryKey }), old) : old
          if (old.pages.flatMap(p => p.messages).some(m => m.id === msg.id)) return old
          return {
            ...old,
            pages: old.pages.map((page, i) => i !== 0 ? page : {
              ...page,
              messages: [msg, ...page.messages.filter(m => !(m.isOptimistic && m.text === msg.text))]
            })
          }
        })

        let shouldIncrementNavbar = false
        queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
          if (!old) return old
          const dialogs = [...old]
          const partnerId = isMe ? msg.recipientId : msg.senderId
          const index = dialogs.findIndex(d => orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId)

          if (index !== -1) {
            const existing = dialogs[index]
            if (existing.lastMessage?.id === msg.id || (isMe && existing.lastMessage?.isOptimistic && existing.lastMessage?.text === msg.text)) {
              if (isMe) dialogs[index] = { ...existing, lastMessage: msg };
              return dialogs;
            }
            const [updated] = dialogs.splice(index, 1)
            if (!isMe && !isCurrentChat) shouldIncrementNavbar = true
            return [{ ...updated, lastMessage: msg, unreadCount: (!isMe && !isCurrentChat) ? updated.unreadCount + 1 : updated.unreadCount }, ...dialogs]
          }
          queryClient.invalidateQueries({ queryKey: ["dialogs"] }); return old
        })

        if (shouldIncrementNavbar) {
          queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => ({ count: (old?.count || 0) + 1 }))
        }
      }

      // 3. ПРОЧТЕНИЕ
      if (type === "MESSAGES_READ") {
        const queryKey = getMessagesQueryKey(contextKey)
        const isReadByMe = data.readerId === userId
        queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
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

    return () => { channel.unbind("events"); pusher.unsubscribe(channelName) }
  }, [userId, queryClient, searchParams])
}
