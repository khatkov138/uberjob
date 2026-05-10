"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Map as MapIcon, Loader2 } from "lucide-react"
import { cn, handleAction } from "@/lib/utils"
import { useQuery, keepPreviousData } from "@tanstack/react-query"

// Хуки и экшены

import { getOrders } from "@/actions/order/get-feed"
import { GetOrdersResponse } from "@/actions/order/get-feed"
import { useActiveFeed } from "../layout/FeedController"

// Динамический импорт движка (Leaflet/Google/Yandex)
const OrdersMap = dynamic(
    () => import("./map-engine").then((mod) => mod.MapEngine),
    {
        ssr: false,
        loading: () => <MapPlaceholder />
    }
)

export function MapViewport() {
    // 1. Читаем наш "Гениальный" стабильный контекст
    const context = useActiveFeed();

    // 2. Основной запрос за маркерами
    const { data, isFetching } = useQuery<GetOrdersResponse<'map'>>({
        // Тот же ключ, что и в гидраторе — это залог успеха
        queryKey: ["orders", "map", context],
        queryFn: () => handleAction(getOrders({ ...context, mode: 'map' })),
        enabled: !!context && context.viewMode === 'map',
        placeholderData: keepPreviousData, // Чтобы карта не пропадала при смене радиуса
        staleTime: 1000 * 60 * 5,
    });

    const orders = data?.orders ?? [];

    // Определяем, нужно ли показывать "затуп" (первая загрузка или смена фильтров)
    const isRefreshing = isFetching && orders.length > 0;

    return (
        <div className="relative h-[700px] w-full group">
            {/* ТЕХНО-РАМКА КАРТЫ */}
            <div className={cn(
                "w-full h-full rounded-[3.5rem] border-2 border-slate-100 bg-slate-50 overflow-hidden relative z-10 transition-all duration-700",
                isRefreshing ? "grayscale-[0.5] opacity-80 shadow-inner" : "shadow-2xl shadow-slate-200/50"
            )}>
                {context && (
                    <OrdersMap
                        orders={orders}
                        center={[context.lat, context.lng]}
                        radius={context.radius}
                        isFetching={isFetching}
                    />
                )}

                {/* ГРАДИЕНТНАЯ МАСКА (Чтобы карта вписывалась в дизайн) */}
                <div className="absolute inset-0 pointer-events-none ring-[24px] ring-white/10 rounded-[3.5rem] z-20" />
            </div>

            {/* ИНДИКАТОР СИНХРОНИЗАЦИИ (Uber-style) */}
            {isFetching && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 animate-in zoom-in-95 fade-in duration-300">
                    <div className="bg-slate-950 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase italic tracking-[0.2em] whitespace-nowrap">
                            Scanning Area / {context.radius}km
                        </span>
                    </div>
                </div>
            )}

            {/* ПЛАШКА С КОЛИЧЕСТВОМ (Для техно-шика) */}
            {!isFetching && orders.length > 0 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white px-5 py-2 rounded-xl border border-slate-100 shadow-xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase italic text-slate-900 tracking-widest">
                            {orders.length} ACTIVE UNITS FOUND
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

function MapPlaceholder() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-100/50 backdrop-blur-md">
            <div className="relative">
                <div className="w-20 h-20 bg-white rounded-[2.5rem] border-2 border-slate-200 flex items-center justify-center animate-pulse shadow-xl">
                    <MapIcon className="w-10 h-10 text-slate-200" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full animate-ping" />
            </div>
            <div className="space-y-1 text-center">
                <p className="font-black italic text-slate-900 uppercase tracking-[0.4em] text-[10px]">
                    ZWORK / MAP
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                    Initializing Engine...
                </p>
            </div>
        </div>
    )
}
