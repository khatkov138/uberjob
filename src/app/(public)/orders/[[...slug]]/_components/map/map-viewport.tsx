"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Map as MapIcon } from "lucide-react"
import { cn, handleAction } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"

// Stores & Hooks
import { useOrdersStore } from "@/store/use-orders-store"
import { useUserSkills } from "@/hooks/use-user-skills"
import { getOrders } from "@/actions/order/get"
import { ServerLocation } from "@/lib/server-utils"

const OrdersMap = dynamic(
    () => import("./map-engine").then((mod) => mod.MapEngine),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50">
                <div className="w-16 h-16 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-center animate-bounce shadow-sm">
                    <MapIcon className="w-8 h-8 text-blue-600" />
                </div>
                <p className="font-black italic text-slate-400 uppercase tracking-[0.3em] text-[9px]">
                    ZWORK / ENGINE
                </p>
            </div>
        )
    }
)

export function MapViewport() {
    // 1. Берем фильтры и скиллы
    const { radius } = useOrdersStore()
    const { skillIds } = useUserSkills()

    // 2. Берем гео-контекст из кеша TanStack
    const { data: location } = useQuery<ServerLocation>({
        queryKey: ['current-location'],
        enabled: false
    })

    // 3. Подписываемся на те же заказы, что и Feed
    const activeFilters = React.useMemo(() => ({
        locationId: location?.id,
        radius: radius,
    }), [location?.id, radius])

    const { data: orders = [], isFetching } = useQuery({
        queryKey: ["orders", activeFilters],
        queryFn: () => handleAction(getOrders(activeFilters)),
        enabled: !!location?.id,
        staleTime: 1000 * 60 * 5,
    })

    return (
        <div className="relative h-[650px] w-full">
            <div className={cn(
                "w-full h-full rounded-[3rem] border border-slate-200 bg-slate-50 overflow-hidden relative z-10 transition-all duration-500",
                isFetching ? "opacity-60 grayscale-[0.2]" : "opacity-100",
            )}>
                {/* 
                   Если location еще не загружен (теоретически), 
                   не рендерим карту, чтобы не было дефолтных координат 
                */}
                {location && (
                    <OrdersMap
                        orders={orders}
                        center={[location.lat, location.lng]}
                        mySkillIds={skillIds}
                        isFetching={isFetching}
                    />
                )}
            </div>
        </div>
    )
}
