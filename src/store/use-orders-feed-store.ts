"use client"

import { create } from "zustand"
import { persist, createJSONStorage, StateStorage } from "zustand/middleware"
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { LOCATION_CONFIG } from "@/lib/location-config"

interface OrdersFeedState {
    // ПЕРСИСТЕНТНЫЕ НАСТРОЙКИ (КУКИ)
    viewMode: "list" | "map"
    radius: number
    _hasHydrated: boolean

    // ЭКШЕНЫ
    setViewMode: (mode: "list" | "map") => void
    setRadius: (radius: number) => void
    setHasHydrated: (state: boolean) => void
}

const cookieStorage: StateStorage = {
    getItem: (name) => (getCookie(name) as string) ?? null,
    setItem: (name, value) => setCookie(name, value, { 
        maxAge: 60 * 60 * 24 * 30, 
        path: '/',
        sameSite: 'lax' 
    }),
    removeItem: (name) => deleteCookie(name),
}

export const useOrdersFeedStore = create<OrdersFeedState>()(
    persist(
        (set) => ({
            viewMode: "list",
            radius: LOCATION_CONFIG.SETTINGS.radius || 50,
            _hasHydrated: false,

            setViewMode: (viewMode) => set({ viewMode }),
            setRadius: (radius) => set({ radius }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'zwork-orders-feed-state',
            storage: createJSONStorage(() => cookieStorage),
            onRehydrateStorage: () => (state) => { 
                state?.setHasHydrated(true); 
            },
            
            // Сохраняем в куки только настройки
            partialize: (state) => ({
                viewMode: state.viewMode,
                radius: state.radius
            }),
        }
    )
)
