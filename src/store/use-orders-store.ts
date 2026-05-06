"use client"

import { create } from "zustand"
import { persist, createJSONStorage, StateStorage } from "zustand/middleware"
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { LOCATION_CONFIG } from "@/lib/location-config"

interface OrdersStoreState {
    viewMode: "list" | "map"
    radius: number
    _hasHydrated: boolean

    setViewMode: (mode: "list" | "map") => void
    setRadius: (radius: number) => void
    setHasHydrated: (state: boolean) => void
}

const cookieStorage: StateStorage = {
    getItem: (name) => (getCookie(name) as string) ?? null,
    setItem: (name, value) => setCookie(name, value, {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax' // Добавим для стабильности кук в браузерах
    }),
    removeItem: (name) => deleteCookie(name),
}

export const useOrdersStore = create<OrdersStoreState>()(
    persist(
        (set) => ({
            viewMode: "list",
            radius: LOCATION_CONFIG.SETTINGS.radius || 50,
            _hasHydrated: false,

            setViewMode: (mode) => set({ viewMode: mode }),
            setRadius: (radius) => set({ radius }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'zwork-orders-state', // Убедись, что на сервере читаешь этот же ключ
            storage: createJSONStorage(() => cookieStorage),

            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },

            partialize: (state) => ({
                viewMode: state.viewMode,
                radius: state.radius
            }),
        }
    )
)
