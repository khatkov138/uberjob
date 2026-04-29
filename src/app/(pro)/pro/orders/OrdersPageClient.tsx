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

import { LoadingState } from "./_components/loading-state"
import { OrdersRadarStatus } from "./_components/orders-radar-status"
import { OrdersViewList } from "./_components/orders-view-list"
import { OrdersViewMap } from "./_components/orders-view-map"

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

    // 1. Стабильные координаты для кеша TanStack Query
    const currentLat = roundCoord(_hasHydrated ? lat : serverLocation.lat)
    const currentLng = roundCoord(_hasHydrated ? lng : serverLocation.lng)
    const currentRadius = _hasHydrated ? radius : serverLocation.radius

    const isServerKey =
        currentLat === roundCoord(serverLocation.lat) &&
        currentLng === roundCoord(serverLocation.lng) &&
        currentRadius === serverLocation.radius;

    // --- ЗАГРУЗКА ЗАКАЗОВ ---
    const { data: orders = [], isFetching: isOrdersFetching, isPending: isInitialLoading } = useQuery<FeedOrder[]>({
        queryKey: ["orders", currentLat, currentLng, currentRadius, session.user.id],
        queryFn: () => handleAction(getOrders({ lat: currentLat, lng: currentLng, radius: currentRadius })),
        initialData: isServerKey ? initialOrders : undefined,
        staleTime: 1000 * 60,
    })

    // --- ЗАГРУЗКА ПРОФИЛЯ ---
    const { data: profile, isFetching: isProfileFetching } = useQuery<FullProfile | null>({
        queryKey: ["user-profile", session.user.id],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile ?? undefined,
    })

    // --- ЛОГИКА МАТЧИНГА И СОРТИРОВКИ ---
    const mySkillIds = React.useMemo(() =>
        new Set(profile?.skills.map(s => s.categoryId) || []),
        [profile])

    // УМНАЯ СОРТИРОВКА: Сначала Matched (по скиллам), потом по дистанции
    const sortedOrders = React.useMemo(() => {
        return [...orders].sort((a, b) => {
            const aMatched = a.categories.some(c => mySkillIds.has(c.categoryId)) ? 1 : 0
            const bMatched = b.categories.some(c => mySkillIds.has(c.categoryId)) ? 1 : 0

            // Если статусы "подходит/не подходит" разные — тот что подходит выше
            if (aMatched !== bMatched) return bMatched - aMatched

            // Если оба одинаковы по статусу — сортируем по близости (ближайшие выше)
            return (a.distance || 0) - (b.distance || 0)
        })
    }, [orders, mySkillIds])

    const stats = React.useMemo(() => ({
        total: orders.length,
        matched: orders.filter(order =>
            order.categories.some(cat => mySkillIds.has(cat.categoryId))
        ).length
    }), [orders, mySkillIds])

    // Показываем полноэкранный лоадер только при самом первом входе
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

                {/* --- ПЕРЕКЛЮЧАТЕЛЬ: СПИСОК / КАРТА --- */}
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

                {/* --- КОНТЕНТНАЯ ОБЛАСТЬ --- */}
                <div className="relative min-h-[500px]">

                    {/* Плашка "Сканирую эфир" (вынесли в отдельный компонент) */}
                    <OrdersRadarStatus isVisible={isOrdersFetching} />

                    {viewMode === "list" ? (
                        <OrdersViewList
                            orders={sortedOrders}
                            isFetching={isOrdersFetching}
                            mySkillIds={mySkillIds}
                        />
                    ) : (
                        <OrdersViewMap
                            orders={sortedOrders}
                            center={[currentLat, currentLng]}
                            radius={currentRadius} // Добавь эту строку
                            isFetching={isOrdersFetching}
                            mySkillIds={mySkillIds}
                        />
                    )}
                </div>
            </div>
        </Container>
    )
}
