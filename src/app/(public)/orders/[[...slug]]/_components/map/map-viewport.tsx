"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { FeedOrder } from "@/actions/order/get"

interface MapViewportProps {
    orders: FeedOrder[]
    center: [number, number]
    radius: number
    isFetching: boolean
    mySkillIds: Set<string>
}

const OrdersMap = dynamic(
    () => import("./map-engine").then((mod) => mod.MapEngine),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50">
                <div className="w-16 h-16 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-center animate-bounce shadow-sm">
                    <MapIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-center">
                    <p className="font-black italic text-slate-400 uppercase tracking-[0.3em] text-[9px]">
                        ZWORK / ENGINE
                    </p>
                </div>
            </div>
        )
    }
)

export function MapViewport({ orders, center, isFetching, mySkillIds }: MapViewportProps) {
    return (
        <div className="relative h-[650px] w-full">
            <div className={cn(
                "w-full h-full rounded-[3rem] border border-slate-200 bg-slate-50 overflow-hidden relative z-10 transition-all duration-500",
                isFetching ? "opacity-60 grayscale-[0.2]" : "opacity-100",
            )}>
                <OrdersMap
                    orders={orders}
                    center={center}
                    mySkillIds={mySkillIds}
                    isFetching={isFetching}
                />
            </div>
            {/* УБРАЛИ ВСЕ ПОДЛОЖКИ С ТЕНЯМИ И БЛЮРОМ */}
        </div>
    )
}

