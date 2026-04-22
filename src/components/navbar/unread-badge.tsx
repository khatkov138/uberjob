"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { authClient } from "@/lib/auth-client"

export function UnreadBadge() {



  const { data: session } = authClient.useSession()

  const { data: countData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count")
      return res.json()
    },
    enabled: !!session?.user?.id,
    refetchInterval: 30000, // Рефетч раз в полминуты (остальное доделает Pusher)
  })

  const count = countData?.count || 0

  if (count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white border-2 border-white animate-in zoom-in">
      {count > 99 ? "99+" : count}
    </span>
  )
}
