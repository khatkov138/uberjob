"use client"

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'

interface LocationState {
  // КЛЮЧИ (Источники истины)
  globalLocationId: string | null    // ID города для фильтрации ленты /orders
  lastOrderLocationId: string | null  // Последняя локация, где юзер создавал заказ
  
  // UI СОСТОЯНИЕ
  isModalOpen: boolean
  _hasHydrated: boolean

  // МЕТОДЫ
  setGlobalLocation: (id: string | null) => void
  setLastOrderLocation: (id: string | null) => void
  openModal: () => void
  closeModal: () => void
  setHasHydrated: (state: boolean) => void
}

// Кастомное хранилище для работы с куками (важно для SSR и Next.js)
const cookieStorage: StateStorage = {
  getItem: (name) => (getCookie(name) as string) ?? null,
  setItem: (name, value) => setCookie(name, value, { 
    maxAge: 60 * 60 * 24 * 30, // 30 дней
    path: '/',
    sameSite: 'lax' 
  }),
  removeItem: (name) => deleteCookie(name),
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      globalLocationId: null,
      lastOrderLocationId: null,
      isModalOpen: false,
      _hasHydrated: false,

      // Методы обновления
      setGlobalLocation: (id) => set({ globalLocationId: id }),
      setLastOrderLocation: (id) => set({ lastOrderLocationId: id }),
      
      // Управление модальным окном выбора города
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
      
      // Флаг гидратации (чтобы клиент понимал, что куки прочитаны)
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'zwork-core-loc', // Имя ключа в куках
      storage: createJSONStorage(() => cookieStorage),
      
      // Вызывается автоматически, когда данные из кук попадают в Zustand
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },

      // Сохраняем в куки ТОЛЬКО ID локаций, UI-стейт (модалки) не храним
      partialize: (state) => ({
        globalLocationId: state.globalLocationId,
        lastOrderLocationId: state.lastOrderLocationId,
      }),
    }
  )
)
