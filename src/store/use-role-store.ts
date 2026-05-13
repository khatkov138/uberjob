// store/use-role-store.ts
import { createStore } from 'zustand'
import { setCookie } from 'cookies-next'

export type RoleMode = 'CLIENT' | 'PRO'

export interface RoleProps {
  mode: RoleMode
}

export interface RoleState extends RoleProps {
  setMode: (mode: RoleMode) => void
}

export const createRoleStore = (initProps: RoleProps) => {
  return createStore<RoleState>((set) => ({
    ...initProps,
    setMode: (mode) => {
      set({ mode })
      setCookie('zwork-mode', mode, { maxAge: 31536000, path: '/' })
    },
  }))
}
