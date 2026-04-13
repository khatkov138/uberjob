import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      // Начальные значения
      city: "Иркутск",
      lat: 52.2895,
      lng: 104.2806,
      radius: 60,
      isModalOpen: false,

      // Экшены
      setLocation: (city, lat, lng) => set({ city, lat, lng }),
      setRadius: (radius) => set({ radius }),
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'user-location-storage',
      // Сохраняем в память только локацию и радиус, состояние модалки не сохраняем
      partialize: (state) => ({
        city: state.city,
        lat: state.lat,
        lng: state.lng,
        radius: state.radius,
      }),
    }
  )
)
