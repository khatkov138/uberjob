"use client"

import { useQuery } from "@tanstack/react-query"
import { useNavbarUser } from "../navbar-provider" // Наш чистый Слой Гранит

interface UnreadCountResponse {
  count: number;
}

export function UnreadBadge() {
  // 1. Достаем зацементированного пользователя из контекста (0ms, без дублирования API запросов)
  const user = useNavbarUser()

  // 2. Декларативный запрос счетчика непрочитанных сообщений в TanStack Query v5
  const { data: countData } = useQuery<UnreadCountResponse>({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count")
      if (!res.ok) throw new Error("Failed to fetch unread count")
      return res.json()
    },
    // Запрос активируется строго тогда, когда на сервере подтверждено наличие ID пользователя
    enabled: !!user?.id,
    staleTime: 1000 * 30, // Данные валидны 30 секунд (защита от DDOS бэкенда)
  })

  const count = countData?.count || 0

  // Если непрочитанных сообщений нет — 0мс влияния на DOM-дерево
  if (count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white border-2 border-white animate-in zoom-in">
      {count > 99 ? "99+" : count}
    </span>
  )
}
