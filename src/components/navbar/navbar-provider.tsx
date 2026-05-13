// providers/NavbarProvider.tsx
'use client'

import { createContext, useContext, useRef, ReactNode } from "react"
import { useStore } from "zustand"
import { createRoleStore, RoleMode, RoleState } from "@/store/use-role-store"

type RoleStoreApi = ReturnType<typeof createRoleStore>

export const NavbarStoreContext = createContext<RoleStoreApi | undefined>(undefined)

export function NavbarProvider({ children, initialMode }: { children: ReactNode, initialMode: RoleMode }) {
  const storeRef = useRef<RoleStoreApi>(null)

  if (!storeRef.current) {
    storeRef.current = createRoleStore({ mode: initialMode })
  }

  return (
    <NavbarStoreContext.Provider value={storeRef.current}>
      {children}
    </NavbarStoreContext.Provider>
  )
}

export function useNavbarStore<T>(selector: (state: RoleState) => T): T {
  const context = useContext(NavbarStoreContext)
  if (!context) throw new Error('useNavbarStore must be used within NavbarProvider')
  return useStore(context, selector)
}
