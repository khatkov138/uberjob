"use client"

import { useEffect } from "react"
import { handleApi } from "@/lib/utils"

interface HeartbeatClientProps {
    isAuthenticated: boolean
}

export function HeartbeatClient({ isAuthenticated }: HeartbeatClientProps) {
    useEffect(() => {
        // Если на сервере определено, что сессии нет — шлюз закрыт
        if (!isAuthenticated) return

        const pulse = () => {
            // handleApi сам проверит res.ok и json.success
            handleApi(
                fetch("/api/user/heartbeat", {
                    method: "POST",
                    keepalive: true // Гарантирует доставку пакета при закрытии вкладки
                })
            ).catch(err => console.error("Heartbeat error:", err))
        }

        // Мгновенный первый хит при монтировании гидратации
        pulse()

        // Установка интервала на 2 минуты
        const interval = setInterval(pulse, 120000)

        // Идеальная зачистка ресурсов в React 19 Concurrent Mode / StrictMode
        return () => clearInterval(interval)
    }, [isAuthenticated]) // Зависимость от примитива: 0 ложных перезапусков таймера

    return null
}
