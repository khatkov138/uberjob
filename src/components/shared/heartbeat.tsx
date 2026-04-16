"use client"

import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"

export function Heartbeat() {
    const { data: session } = authClient.useSession()

    useEffect(() => {
        // Если юзера нет, ничего не делаем
        if (!session?.user) return

        const pulse = () => {
            fetch("/api/user/heartbeat", { 
                method: "POST",
                // Используем keepalive, чтобы запрос дошел, даже если вкладка закрывается
                keepalive: true 
            })
        }

        // Отправляем первый сигнал сразу
        pulse()

        // Повторяем каждые 2 минуты (120 000 мс)
        const interval = setInterval(pulse, 120000)

        return () => clearInterval(interval)
    }, [session])

    // Компонент ничего не рендерит, он просто работает в фоне
    return null
}
