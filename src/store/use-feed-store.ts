"use client"

import { createStore } from "zustand"
import { persist, createJSONStorage, StateStorage } from "zustand/middleware"
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { LOCATION_CONFIG } from "@/lib/location-config"

export interface FeedProps {
    viewMode: "list" | "map"
    radius: number
}

export interface FeedState extends FeedProps {
    setViewMode: (mode: "list" | "map") => void
    setRadius: (radius: number) => void
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

// ЭТО ФАБРИКА. Она вызывается в Провайдере на клиенте.
export const createFeedStore = (initProps: Partial<FeedProps>) => {
    return createStore<FeedState>()(
        persist(
            (set) => ({
                viewMode: initProps.viewMode || "list",
                radius: initProps.radius || LOCATION_CONFIG.SETTINGS.radius || 50,

                setViewMode: (viewMode) => set({ viewMode }),
                setRadius: (radius) => set({ radius }),
            }),
            {
                name: 'zwork-feed-state',
                storage: createJSONStorage(() => cookieStorage),
                 //skipHydration: true, 
                partialize: (state) => ({
                    viewMode: state.viewMode,
                    radius: state.radius
                }),
            }
        )
    )
}
