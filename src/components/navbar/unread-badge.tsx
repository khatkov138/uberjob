"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getGlobalUnreadCount } from "@/actions/chat/message"

export function UnreadBadge() {
 
  const { data: count } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => getGlobalUnreadCount(),
  })

 

  if (!count || count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white border-2 border-white animate-in zoom-in">
      {count > 99 ? "99+" : count}
    </span>
  )
}
