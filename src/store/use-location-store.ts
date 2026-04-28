"use client"

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { DEFAULT_LOCATION, roundCoord } from '@/lib/location-config'

interface LocationState {
  city: string
  lat: number
  lng: number
  radius: number
  isModalOpen: boolean
  // Флаг готовности данных из кук
  _hasHydrated: boolean 
  setLocation: (city: string, lat: number, lng: number) => void
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
      isModalOpen: false,
      _hasHydrated: false, // Изначально false

      setLocation: (city, lat, lng) => set({ 
        city, 
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
      // Эта функция сработает, когда Zustand вычитает данные из кук
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        city: state.city,
        lat: state.lat,
        lng: state.lng,
        radius: state.radius,
      }),
    }
  )
)
