'use client'

import { createContext, useContext, useRef, ReactNode } from "react"
import { useStore } from "zustand"
import { createRoleStore, RoleMode, RoleState } from "@/store/use-role-store"
import { User } from "@/lib/auth"

// Строгий контракт типа пользователя (без use of implicit/explicit any)


type RoleStoreApi = ReturnType<typeof createRoleStore>

export const NavbarStoreContext = createContext<RoleStoreApi | undefined>(undefined)
export const NavbarUserContext = createContext<User | null>(null)

interface NavbarProviderProps {
  children: ReactNode;
  initialMode: RoleMode;
  user: User | null; // 🧱 Зацементированный Слой Гранит для сессии
}

export function NavbarProvider({ children, initialMode, user }: NavbarProviderProps) {
  const storeRef = useRef<RoleStoreApi>(null)

  if (!storeRef.current) {
    storeRef.current = createRoleStore({ mode: initialMode })
  }

  return (
    <NavbarStoreContext.Provider value={storeRef.current}>
      <NavbarUserContext.Provider value={user}>
        {children}
      </NavbarUserContext.Provider>
    </NavbarStoreContext.Provider>
  )
}

// Селектор стора (Слой Ртуть для роли)
export function useNavbarStore<T>(selector: (state: RoleState) => T): T {
  const context = useContext(NavbarStoreContext)
  if (!context) throw new Error('useNavbarStore must be used within NavbarProvider')
  return useStore(context, selector)
}

// 🛡️ Абсолютная защита от холостых GET-запросов на клиенте
export function useNavbarUser() {
  const context = useContext(NavbarUserContext)
  // Возвращает user или null (если гость), без вызова authClient.useSession()
  return context
}
