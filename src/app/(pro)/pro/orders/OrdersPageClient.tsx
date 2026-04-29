"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, LayoutList, Map as MapIcon } from "lucide-react"

import { useLocationStore } from "@/store/use-location-store"
import { roundCoord } from "@/lib/location-config"
import { cn, handleAction } from "@/lib/utils"

import { Container } from "@/components/shared/container"
import { getOrders, type FeedOrder } from "@/actions/order/get"
import { getMyProfile, type FullProfile } from "@/actions/profile/get"

import type { Session } from "@/lib/auth"
import { FeedHeader } from "./_components/feed-header"
import { OrderCard } from "./_components/order-card"
import { EmptyState } from "./_components/empty-state"
import { LoadingState } from "./_components/loading-state"
// import { OrdersMap } from "./_components/orders-map" 

interface OrdersPageClientProps {
    session: Session
    initialOrders: FeedOrder[]
    initialProfile: FullProfile | null
    serverLocation: { lat: number; lng: number; radius: number; city: string }
}

type ViewMode = "list" | "map"

export default function OrdersPageClient({
    session,
    initialOrders,
    initialProfile,
    serverLocation
}: OrdersPageClientProps) {
    const [viewMode, setViewMode] = React.useState<ViewMode>("list")
    const { lat, lng, radius, _hasHydrated } = useLocationStore()

    // 1. Стабильные координаты для ключа
    const currentLat = roundCoord(_hasHydrated ? lat : serverLocation.lat)
    const currentLng = roundCoord(_hasHydrated ? lng : serverLocation.lng)
    const currentRadius = _hasHydrated ? radius : serverLocation.radius

    const isServerKey =
        currentLat === roundCoord(serverLocation.lat) &&
        currentLng === roundCoord(serverLocation.lng) &&
        currentRadius === serverLocation.radius;

    // --- ЗАГРУЗКА ДАННЫХ ---
    const { data: orders = [], isFetching: isOrdersFetching, isPending: isInitialLoading } = useQuery<FeedOrder[]>({
        queryKey: ["orders", currentLat, currentLng, currentRadius, session.user.id],
        queryFn: () => handleAction(getOrders({ lat: currentLat, lng: currentLng, radius: currentRadius })),
        initialData: isServerKey ? initialOrders : undefined,
        staleTime: 1000 * 60,
    })

    const { data: profile, isFetching: isProfileFetching } = useQuery<FullProfile | null>({
        queryKey: ["user-profile", session.user.id],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile ?? undefined,
    })

    // --- МЕМОИЗАЦИЯ ---
    const mySkillIds = React.useMemo(() =>
        new Set(profile?.skills.map(s => s.categoryId) || []),
        [profile])

    const stats = React.useMemo(() => ({
        total: orders.length,
        matched: orders.filter(order =>
            order.categories.some(cat => mySkillIds.has(cat.categoryId))
        ).length
    }), [orders, mySkillIds])

    // Глобальный лоадер при первом входе
    if (isInitialLoading && !initialOrders.length) return <LoadingState />

    return (
        <Container className="bg-slate-50/50 py-10 pb-32">
            <div className="space-y-10">
                <FeedHeader
                    userSkills={profile?.skills || []}
                    userId={session.user.id}
                    stats={stats}
                    isUpdating={isOrdersFetching || isProfileFetching}
                />

                {/* --- ПЕРЕКЛЮЧАТЕЛЬ --- */}
                <div className="flex justify-center md:justify-start">
                    <div className="bg-white p-2 rounded-[2.5rem] flex items-center gap-2 border-2 border-slate-100 shadow-sm relative z-10">
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "flex items-center gap-3 px-8 py-3.5 rounded-[2rem] transition-all duration-500",
                                viewMode === "list" 
                                    ? "bg-slate-900 text-white shadow-xl scale-105" 
                                    : "text-slate-400 hover:bg-slate-50"
                            )}
                        >
                            <LayoutList className={cn("w-4 h-4", viewMode === "list" ? "text-blue-500" : "text-slate-300")} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Список</span>
                        </button>

                        <button
                            onClick={() => setViewMode("map")}
                            className={cn(
                                "flex items-center gap-3 px-8 py-3.5 rounded-[2rem] transition-all duration-500",
                                viewMode === "map" 
                                    ? "bg-blue-600 text-white shadow-xl shadow-blue-100 scale-105" 
                                    : "text-slate-400 hover:bg-slate-50"
                            )}
                        >
                            <MapIcon className={cn("w-4 h-4", viewMode === "map" ? "text-white" : "text-slate-300")} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Карта</span>
                        </button>
                    </div>
                </div>

                {/* --- КОНТЕНТ --- */}
                <div className="relative min-h-[500px]">
                    {/* Плашка загрузки обновления */}
                    {isOrdersFetching && (
                        <div className="absolute inset-x-0 -top-4 z-40 flex justify-center pointer-events-none">
                            <div className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest italic">Сканирую эфир...</span>
                            </div>
                        </div>
                    )}

                    {viewMode === "list" ? (
                        <div className={cn(
                            "grid gap-8 transition-all duration-500",
                            isOrdersFetching ? "opacity-30 blur-sm scale-[0.99] pointer-events-none" : "opacity-100"
                        )}>
                            {orders.length > 0 ? (
                                orders.map((order) => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        isMatched={order.categories.some(c => mySkillIds.has(c.categoryId))}
                                    />
                                ))
                            ) : !isOrdersFetching && <EmptyState />}
                        </div>
                    ) : (
                        <div className="relative h-[650px] w-full isolation-isolate">
                            <div className={cn(
                                "w-full h-full rounded-[4rem] border-4 border-white shadow-2xl overflow-hidden bg-slate-100 transition-all duration-500",
                                isOrdersFetching ? "opacity-50 grayscale-[0.5]" : "opacity-100",
                                "animate-in fade-in duration-700"
                            )}>
                                {/* Место для OrdersMap */}
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                    <div className="w-14 h-14 bg-white rounded-3xl shadow-md flex items-center justify-center animate-bounce">
                                        <MapIcon className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <p className="font-black italic text-slate-300 uppercase tracking-[0.3em] text-[10px]">
                                        ZWORK / GEO-ENGINE ACTIVE
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Container>
    )
}
