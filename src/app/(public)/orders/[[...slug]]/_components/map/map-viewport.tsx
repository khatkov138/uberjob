"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"

import { useUserSkills } from "@/hooks/use-user-skills"
import { FeedContext } from "../../page"
import { GetOrdersResponse } from "@/actions/order/get"

// Динамический импорт движка карты
const OrdersMap = dynamic(
    () => import("./map-engine").then((mod) => mod.MapEngine),
    {
        ssr: false,
        loading: () => <MapPlaceholder />
    }
)

export function MapViewport() {

    // 1. Читаем единый контекст из Observer Bus
    const { data: context } = useQuery<FeedContext>({
        queryKey: ['feed-context'],
        enabled: false,
        queryFn: () => { throw new Error("Observer: feed-context is missing in cache") },
    })

    // 2. Подписываемся на "КАРТОЧНЫЙ" ключ (mode: map)
    // Эти данные наполняются в OrdersPageUI.tsx
    const { data, isFetching } = useQuery<GetOrdersResponse<'map'>>({
        queryKey: ["orders", "map", context], // <--- Используем специфичный ключ для карты
        queryFn: () => { throw new Error("Observer: map orders data is missing in cache") },
        enabled: !!context,
    })

    const orders = data?.orders ?? []

    return (
        <div className="relative h-[650px] w-full">
            <div className={cn(
                "w-full h-full rounded-[3.5rem] border border-slate-100 bg-slate-50 overflow-hidden relative z-10 transition-all duration-700",
                isFetching && orders.length === 0 ? "opacity-60 blur-md grayscale-[0.5]" : "opacity-100",
            )}>
                {context && (
                    <OrdersMap
                        // Передаем облегченные заказы
                        orders={orders}
                        center={[context.lat, context.lng]}
                        radius={context.radius}
                        isFetching={isFetching}
                    />
                )}
            </div>

            {/* Оверлей при обновлении (refetch) */}
            {isFetching && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-100 shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 animate-pulse">
                            Синхронизация карты...
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function MapPlaceholder() {
    return (
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
