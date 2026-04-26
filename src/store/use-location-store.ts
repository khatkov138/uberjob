import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'

interface LocationState {
  city: string
  lat: number
  lng: number
  radius: number
  isModalOpen: boolean
  setLocation: (city: string, lat: number, lng: number) => void
  setRadius: (radius: number) => void
  openModal: () => void
  closeModal: () => void
}

// 1. Создаем базовый адаптер (только строковые операции)
const cookieStorage: StateStorage = {
  getItem: (name) => (getCookie(name) as string) ?? null,
  setItem: (name, value) => 
    setCookie(name, value, { 
      maxAge: 60 * 60 * 24 * 30, 
      path: '/',
      sameSite: 'lax' 
    }),
  removeItem: (name) => deleteCookie(name),
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      city: "Иркутск",
      lat: 52.2895,
      lng: 104.2806,
      radius: 60,
      isModalOpen: false,

      setLocation: (city, lat, lng) => set({ city, lat, lng }),
      setRadius: (radius) => set({ radius }),
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'user-location-storage',
      // 2. Оборачиваем наш адаптер в createJSONStorage
      storage: createJSONStorage(() => cookieStorage), 
      partialize: (state) => ({
        city: state.city,
        lat: state.lat,
        lng: state.lng,
        radius: state.radius,
      }),
    }
  )
)
