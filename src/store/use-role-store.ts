import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

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
        // Сохраняем в куки на 1 год. Теперь сервер будет видеть это поле.
        Cookies.set('zwork-mode', mode, { expires: 365 })
      },
    }),
    { name: 'zwork-ui-mode' }
  )
)
