"use client"

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { DEFAULT_LOCATION, roundCoord } from '@/lib/location-config'

interface LocationState {
  city: string
  slug: string
  lat: number
  lng: number
  yandexUri: string // <--- Добавили "паспорт" локации
  radius: number
  isModalOpen: boolean
  _hasHydrated: boolean
  // Теперь принимает 5 аргументов для полной синхронизации
  setLocation: (city: string, lat: number, lng: number, slug: string, yandexUri: string) => void
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
      ...DEFAULT_LOCATION,
      yandexUri: DEFAULT_LOCATION.yandexUri, // Убедись, что в конфиге есть дефолт
      isModalOpen: false,
      _hasHydrated: false,

      setLocation: (city, lat, lng, slug, yandexUri) => set({
        city,
        slug,
        lat: roundCoord(lat),
        lng: roundCoord(lng),
        yandexUri // Сохраняем URI
      }),

      setRadius: (radius) => set({ radius }),
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'user-location-storage',
      storage: createJSONStorage(() => cookieStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        city: state.city,
        slug: state.slug,
        lat: state.lat,
        lng: state.lng,
        radius: state.radius,
        yandexUri: state.yandexUri, // <--- Важно: сохраняем в куки для SSR
      }),
    }
  )
)
