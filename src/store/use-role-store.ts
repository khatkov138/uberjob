import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setCookie } from 'cookies-next' // Импортируем из cookies-next

type RoleMode = 'CLIENT' | 'PRO'

interface RoleState {
  mode: RoleMode
  setMode: (mode: RoleMode) => void
}

export const useRoleModeStore = create<RoleState>()(
  persist(
    (set) => ({
      mode: 'CLIENT',
      setMode: (mode) => {
        set({ mode })
        // Используем setCookie. Параметр maxAge задается в секундах.
        // 365 дней * 24 часа * 60 мин * 60 сек = 31536000
        setCookie('zwork-mode', mode, { maxAge: 31536000 })
      },
    }),
    { name: 'zwork-ui-mode' }
  )
)
