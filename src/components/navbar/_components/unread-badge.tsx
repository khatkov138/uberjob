"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { handleApi } from "@/lib/utils" // 🚀 Импортируем твой хелпер-перехватчик
import { useNavbarUser } from "../navbar-provider"

interface UnreadCountResponse {
  count: number;
}

export function UnreadBadge() {
  // 1. Достаем зацементированного пользователя из контекста (Слой Гранит, 0ms ререндеров)
  const user = useNavbarUser()

  // 2. Декларативный запрос счетчика непрочитанных сообщений в TanStack Query v5
  const { data: countData } = useQuery<UnreadCountResponse>({
    queryKey: ["unread-count"],
    // 🛡️ Чистый, безопасный сетевой контракт через handleApi без бойлерплейта
    queryFn: async () => {
      return handleApi(fetch("/api/messages/unread-count", { method: "GET" }))
    },
    // Запрос активируется строго тогда, когда на сервере подтверждено наличие ID пользователя
    enabled: !!user?.id,
    staleTime: 1000 * 30, // Защита бэкенда от DDOS
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
