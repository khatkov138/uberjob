"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Map as MapIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { FeedOrder } from "@/actions/order/get"

// --- ТИПИЗАЦИЯ ---
interface OrdersViewMapProps {
    orders: FeedOrder[]
    center: [number, number]
    isFetching: boolean
    mySkillIds: Set<string>
}

// --- ЛЕНИВАЯ ЗАГРУЗКА ЯДРА КАРТЫ ---
// Мы не грузим тяжелый API Яндекса, пока юзер не переключит вкладку
const OrdersMap = dynamic(
    () => import("./orders-map").then((mod) => mod.OrdersMap),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50/50">
                <div className="w-16 h-16 bg-white rounded-[2rem] shadow-sm flex items-center justify-center animate-bounce">
                    <MapIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-center space-y-1">
                    <p className="font-black italic text-slate-400 uppercase tracking-[0.3em] text-[10px]">
                        ZWORK / GEO-ENGINE
                    </p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        Инициализация потока данных...
                    </p>
                </div>
            </div>
        )
    }
)

export function OrdersViewMap({
    orders,
    center,
    isFetching,
    mySkillIds
}: OrdersViewMapProps) {
    return (
        <div className="relative h-[650px] w-full isolation-isolate">
            {/* РАМКА В СТИЛЕ NEO-BRUTALISM */}
            <div className={cn(
                "w-full h-full rounded-[4rem] border-4 border-white shadow-2xl overflow-hidden bg-slate-100 transition-all duration-500",
                "relative z-10",
                isFetching ? "opacity-50 grayscale-[0.5] scale-[0.99]" : "opacity-100 scale-100",
                "animate-in fade-in zoom-in-95 duration-700"
            )}>
                <OrdersMap
                    orders={orders}
                    center={center}
                    mySkillIds={mySkillIds}
                />
            </div>

            {/* ДЕКОРАТИВНЫЙ ПОДЛОЖЕК (Тень или эффект глубины) */}
            <div className="absolute inset-0 bg-blue-600/5 blur-[100px] -z-10 rounded-full" />
        </div>
    )
}
