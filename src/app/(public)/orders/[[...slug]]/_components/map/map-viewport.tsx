"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"

import { useOrdersStore } from "@/store/use-orders-store"
import { useUserSkills } from "@/hooks/use-user-skills"
import { FeedOrder } from "@/actions/order/get"
import { FeedContext } from "../../page" // Импортируем тип контекста

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
    const { radius } = useOrdersStore()
    const { skillIds } = useUserSkills()

    // 1. Достаем гео-контекст из кеша
    const { data: location } = useQuery<FeedContext>({
        queryKey: ['current-location'],
        queryFn: () => { throw new Error("Location cache missing") },
        enabled: false,
        staleTime: Infinity
    })

    // 2. Формируем ключ. ВАЖНО: он должен на 100% совпадать с ключом в Feed и PageClient
    // включая categoryId, даже если карта его не использует для фильтрации внутри себя.
    const activeParams = React.useMemo(() => {
        if (!location) return null
        return {
            ...location,
            radius: radius,
            categoryId: location.categoryId || null 
        }
    }, [location, radius])

    // 3. Подписываемся на данные ленты
    const { data: orders = [], isFetching } = useQuery<FeedOrder[]>({
        queryKey: ["orders", activeParams],
        enabled: !!activeParams,
        queryFn: () => { throw new Error("Observer query should not fetch") },
        staleTime: Infinity
    })

    return (
        <div className="relative h-[650px] w-full">
            <div className={cn(
                "w-full h-full rounded-[3rem] border border-slate-200 bg-slate-50 overflow-hidden relative z-10 transition-all duration-700",
                isFetching ? "opacity-60 blur-[2px] grayscale-[0.5]" : "opacity-100",
            )}>
                {location && (
                    <OrdersMap
                        orders={orders}
                        // Центрируем карту по выбранному городу из SSR контекста
                        center={[location.lat, location.lng]}
                        mySkillIds={skillIds}
                        isFetching={isFetching}
                    />
                )}
            </div>

            {/* Оверлей загрузки для карты */}
            {isFetching && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                     <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-100 shadow-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 animate-pulse">
                            Обновление эфира...
                        </p>
                     </div>
                </div>
            )}
        </div>
    )
}
