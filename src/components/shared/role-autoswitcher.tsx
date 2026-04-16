"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useRoleModeStore } from "@/store/use-role-store"

export function RoleAutoswitcher() {
  const pathname = usePathname()
  const { mode, setMode } = useRoleModeStore()

  useEffect(() => {
    // Определяем желаемый режим по URL
    const targetMode = pathname.startsWith('/pro') ? 'PRO' : 
                       pathname.startsWith('/client') ? 'CLIENT' : null

    // Переключаем ТОЛЬКО если режим в сторе не совпадает с URL
    if (targetMode && mode !== targetMode) {
      setMode(targetMode)
    }
  }, [pathname, mode, setMode])

  return null
}
