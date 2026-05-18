"use client"

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'

interface LocationState {
  // КЛЮЧИ (Источники истины переведены со строгих ID на ЧПУ Слаги 🚀)
  globalLocationSlug: string | null    // СЛАГ города для фильтрации ленты /orders (например, "moskva")
  lastOrderLocationSlug: string | null // Последняя локация, где юзер создавал заказ
  
  // UI СОСТОЯНИЕ
  isModalOpen: boolean
  _hasHydrated: boolean

  // МЕТОДЫ (Сохраняем сигнатуру, меняем ID на СЛАГ, чтобы не сломать остальной код)
  setGlobalLocation: (slug: string | null) => void
  setLastOrderLocation: (slug: string | null) => void
  openModal: () => void
  closeModal: () => void
  setHasHydrated: (state: boolean) => void
}

// Кастомное хранилище для работы с куками (твое оригинальное, без изменений)
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
      // Инициализируем пустые слаги на старте
      globalLocationSlug: null,
      lastOrderLocationSlug: null,
      isModalOpen: false,
      _hasHydrated: false,

      // Методы теперь принимают и записывают слаг строки
      setGlobalLocation: (slug) => set({ globalLocationSlug: slug }),
      setLastOrderLocation: (slug) => set({ lastOrderLocationSlug: slug }),
      
      // Управление модальным окном выбора города
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
      
      // Флаг гидратации
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'zwork-core-loc', // Тот же ключ в куках
      storage: createJSONStorage(() => cookieStorage),
      
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },

      // Сохраняем в куки ТОЛЬКО слаги локаций, UI-стейт по-прежнему игнорируем
      partialize: (state) => ({
        globalLocationSlug: state.globalLocationSlug,
        lastOrderLocationSlug: state.lastOrderLocationSlug,
      }),
    }
  )
)
