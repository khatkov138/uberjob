"use client"

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { DEFAULT_LOCATION, roundCoord } from '@/lib/location-config'

interface LocationState {
  city: string
  slug: string // Добавили слаг
  lat: number
  lng: number
  radius: number
  isModalOpen: boolean
  _hasHydrated: boolean 
  // Обновили сигнатуру: теперь принимает 4 аргумента
  setLocation: (city: string, lat: number, lng: number, slug: string) => void
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
      // В DEFAULT_LOCATION тоже должен быть slug (например, 'angarsk')
      isModalOpen: false,
      _hasHydrated: false,

      setLocation: (city, lat, lng, slug) => set({ 
        city, 
        slug, // Сохраняем слаг в стор и куки
        lat: roundCoord(lat), 
        lng: roundCoord(lng) 
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
        slug: state.slug, // Обязательно сохраняем слаг в куки
        lat: state.lat,
        lng: state.lng,
        radius: state.radius,
      }),
    }
  )
)
