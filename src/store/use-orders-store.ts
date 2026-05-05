"use client"

import { create } from "zustand"
import { persist, createJSONStorage, StateStorage } from "zustand/middleware"
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { LOCATION_CONFIG } from "@/lib/location-config"

interface OrdersStoreState {
    viewMode: "list" | "map"
    radius: number
    setViewMode: (mode: "list" | "map") => void
    setRadius: (radius: number) => void
}

// Используем ту же логику хранения в куках, что и для локации
const cookieStorage: StateStorage = {
    getItem: (name) => (getCookie(name) as string) ?? null,
    setItem: (name, value) => setCookie(name, value, { maxAge: 60 * 60 * 24 * 30, path: '/' }),
    removeItem: (name) => deleteCookie(name),
}

export const useOrdersStore = create<OrdersStoreState>()(
    persist(
        (set) => ({
            viewMode: "list",
            radius: LOCATION_CONFIG.SETTINGS.radius,
            setViewMode: (mode) => set({ viewMode: mode }),
            setRadius: (radius) => set({ radius }),
        }),
        {
            name: 'zwork-orders-state',
            storage: createJSONStorage(() => cookieStorage),
            // Сохраняем в куки только важные для сервера данные
            partialize: (state) => ({
                viewMode: state.viewMode,
                radius: state.radius
            }),
        }
    )
)
