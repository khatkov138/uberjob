import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ClientLocationState {
  lastCity: string
  lastLat: number
  lastLng: number
  setClientLocation: (city: string, lat: number, lng: number) => void
}

export const useClientLocationStore = create<ClientLocationState>()(
  persist(
    (set) => ({
      lastCity: "",
      lastLat: 0,
      lastLng: 0,
      setClientLocation: (city, lat, lng) => 
        set({ lastCity: city, lastLat: lat, lastLng: lng }),
    }),
    { name: 'client-location-storage' }
  )
)
