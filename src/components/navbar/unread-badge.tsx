"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getGlobalUnreadCount } from "@/actions/chat/message"
import * as React from "react"
import Pusher from "pusher-js"

export function UnreadBadge({ userId }: { userId: string }) {
  const queryClient = useQueryClient()

  const { data: count } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => getGlobalUnreadCount(),
  })

  React.useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    // Слушаем личный канал пользователя для уведомлений
    const channel = pusher.subscribe(`user-notifications-${userId}`)
    
    channel.bind("new-unread-message", () => {
      // Когда прилетает сигнал о новом сообщении — обновляем счетчик
      queryClient.invalidateQueries({ queryKey: ["unread-count"] })
    })

    return () => {
      pusher.unsubscribe(`user-notifications-${userId}`)
      pusher.disconnect()
    }
  }, [userId, queryClient])

  if (!count || count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white border-2 border-white animate-in zoom-in">
      {count > 99 ? "99+" : count}
    </span>
  )
}
