"use client"

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'

interface LocationState {
  // КЛЮЧИ (Источники истины)
  globalLocationId: string | null    // Для фильтрации ленты /orders
  lastOrderLocationId: string | null  // Для дефолта в форме создания заказа
  radius: number

  // UI СОСТОЯНИЕ
  isModalOpen: boolean
  _hasHydrated: boolean

  // МЕТОДЫ
  setGlobalLocation: (id: string) => void
  setLastOrderLocation: (id: string) => void
  setRadius: (radius: number) => void
  openModal: () => void
  closeModal: () => void
  setHasHydrated: (state: boolean) => void
}

const cookieStorage: StateStorage = {
  getItem: (name) => (getCookie(name) as string) ?? null,
  setItem: (name, value) => setCookie(name, value, { maxAge: 60 * 60 * 24 * 30, path: '/' }),
  removeItem: (name) => deleteCookie(name),
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      globalLocationId: null,
      lastOrderLocationId: null,
      radius: 100,
      isModalOpen: false,
      _hasHydrated: false,

      setGlobalLocation: (id) => set({ globalLocationId: id }),
      setLastOrderLocation: (id) => set({ lastOrderLocationId: id }),
      setRadius: (radius) => set({ radius }),

      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'zwork-core-loc',
      storage: createJSONStorage(() => cookieStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      partialize: (state) => ({
        globalLocationId: state.globalLocationId,
        lastOrderLocationId: state.lastOrderLocationId,
        radius: state.radius,
      }),
    }
  )
)
