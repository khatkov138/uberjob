"use client"

import * as React from 'react'
import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useLocationStore } from "@/store/use-location-store"
import { useOrdersStore } from "@/store/use-orders-store"
import { FeedContext } from '../../page'

const ActiveContext = createContext<FeedContext | null>(null);

export const useActiveFeed = () => {
    const ctx = useContext(ActiveContext);
    if (!ctx) throw new Error('useActiveFeed must be used within FeedProvider');
    return ctx;
};

export const FeedProvider = ({ value, children }: { value: FeedContext, children: ReactNode }) => {
    const [mounted, setMounted] = useState(false);

    const globalLocationId = useLocationStore(s => s.globalLocationId);
    const setGlobalLocation = useLocationStore(s => s.setGlobalLocation);
    const locHydrated = useLocationStore(s => s._hasHydrated);
    const ordersHydrated = useOrdersStore(s => s._hasHydrated);

    useEffect(() => { setMounted(true); }, []);

    const isReady = mounted && locHydrated && ordersHydrated;

    /**
     * SILENT SYNC
     * Теперь, когда в value.locationId гарантированно приходит новый ID из URL,
     * этот эффект увидит разницу с globalLocationId и сработает.
     */
    useEffect(() => {
        if (isReady && value.locationId && value.locationId !== globalLocationId) {
            setGlobalLocation(value.locationId);
            console.log(`[ZWORK SYNC] Global state aligned with URL: ${value.locationId}`);
        }
    }, [isReady, value.locationId, globalLocationId, setGlobalLocation]);

    return (
        <ActiveContext.Provider value={value}>
            {children}
        </ActiveContext.Provider>
    );
};
