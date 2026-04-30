"use client"

import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { handleApi } from "@/lib/utils"

export function Heartbeat() {
    const { data: session } = authClient.useSession()

    useEffect(() => {
        if (!session?.user) return

        const pulse = () => {
            // handleApi сам проверит res.ok и json.success
            handleApi(fetch("/api/user/heartbeat", { 
                method: "POST",
                keepalive: true 
            })).catch(err => console.error("Heartbeat error:", err))
        }

        pulse()
        const interval = setInterval(pulse, 120000)

        return () => clearInterval(interval)
    }, [session])

    return null
}
