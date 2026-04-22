"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useQueryClient, InfiniteData } from "@tanstack/react-query"
import { getPusherClient } from "@/lib/pusher-client"
import { ChatDialog, MessagesPage, PusherPayload } from "@/lib/types/chat"
import { Notification as DbNotification } from "../../prisma/generated"
import { getChatKey, getMessagesQueryKey } from "@/lib/utils"

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()
  const pathname = usePathname()

  useEffect(() => {
    if (!userId) return

    const pusher = getPusherClient()
    const channelName = `user-${userId}`
    const channel = pusher.subscribe(channelName)

    channel.bind("events", (payload: PusherPayload) => {
      if (payload.type === "NEW_MESSAGE") {
        const { message: msg, orderId, senderId } = payload.data
        const isMe = msg.senderId === userId

        // ГЕНЕРАЦИЯ КЛЮЧА (Совпадает с ChatWindow на 100%)
        // Для лички (direct) мы берем ID отправителя и получателя, сортируем и склеиваем
        // ВАЖНО: partnerId для ключа — это тот, кто НЕ МЫ.
        const partnerId = isMe ? msg.recipientId : msg.senderId;

        const chatKey = getChatKey(orderId, userId, msg.recipientId === userId ? msg.senderId : msg.recipientId);
        const queryKey = getMessagesQueryKey(chatKey);

        const isCurrentChat = pathname.includes(orderId || partnerId || "")

        console.log("HOOK", { chatKey })

        // А) Обновляем бабблы
        queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
          console.log('TEST1')
          if (!old) {
            console.log('TEST2')
            // Если кэша нет во второй вкладке — инвалидируем, чтобы она "проснулась"
            if (isCurrentChat) queryClient.invalidateQueries({ queryKey: queryKey })
            return old
          }
          console.log('TEST3')
          if (old.pages.flatMap(p => p.messages).some(m => m.id === msg.id)) return old

          return {
            ...old,
            pages: old.pages.map((page, index) => {
              if (index !== 0) return page
              const filtered = page.messages.filter(m =>
                !(m.isOptimistic && m.senderId === msg.senderId && m.text === msg.text)
              )
              return { ...page, messages: [msg, ...filtered] }
            })
          }
        })

        // Б) Обновляем список диалогов
        queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
          if (!old) return old
          const dialogs = [...old]
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

          queryClient.invalidateQueries({ queryKey: ["dialogs"] })
          return old
        })

        // В) Обновляем счетчик в Navbar
        if (!isCurrentChat && !isMe) {
          queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => {
            return { count: (old?.count || 0) + 1 }
          })
        }
      }

      if (payload.type === "SYSTEM_NOTIFICATION") {
        const { notification } = payload.data
        queryClient.setQueryData<DbNotification[]>(["notifications"], (old) => {
          return [notification, ...(old || [])]
        })
      }
    })

    return () => {
      channel.unbind("events")
      pusher.unsubscribe(channelName)
    }
  }, [userId, queryClient, pathname])
}
