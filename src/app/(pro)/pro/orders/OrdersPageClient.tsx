"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Inbox } from "lucide-react"

import { useLocationStore } from "@/store/use-location-store"
import { roundCoord } from "@/lib/location-config"
import { handleAction } from "@/lib/utils"

import { Container } from "@/components/shared/container"

import { getOrders, type FeedOrder } from "@/actions/order/get"
import { getMyProfile, type FullProfile } from "@/actions/profile/get"

import type { Session } from "@/lib/auth"
import { FeedHeader } from "./_components/feed-header"
import { OrderCard } from "./_components/order-card"

interface OrdersPageClientProps {
    session: Session
    initialOrders: FeedOrder[]
    initialProfile: FullProfile | null
    serverLocation: { lat: number; lng: number; radius: number; city: string }
}

export default function OrdersPageClient({
    session,
    initialOrders,
    initialProfile,
    serverLocation
}: OrdersPageClientProps) {
    // Достаем данные и флаг гидратации из стора
    const { lat, lng, radius, _hasHydrated } = useLocationStore()

    // 1. Координаты, которые реально пойдут в ключ
    const currentLat = roundCoord(_hasHydrated ? lat : serverLocation.lat)
    const currentLng = roundCoord(_hasHydrated ? lng : serverLocation.lng)
    const currentRadius = _hasHydrated ? radius : serverLocation.radius

    // 2. Проверяем, совпадает ли текущий ключ с тем, что прислал сервер
    // Если мы поменяли радиус, серверные initialOrders нам уже не подходят
    const isServerKey =
        currentLat === roundCoord(serverLocation.lat) &&
        currentLng === roundCoord(serverLocation.lng) &&
        currentRadius === serverLocation.radius;

    const { data: orders = [], isFetching: isOrdersFetching } = useQuery<FeedOrder[]>({
        queryKey: ["orders", currentLat, currentLng, currentRadius, session.user.id],
        queryFn: () => handleAction(getOrders({ lat: currentLat, lng: currentLng, radius: currentRadius })),
        // Подставляем начальные данные ТОЛЬКО если координаты совпадают
        initialData: isServerKey ? initialOrders : undefined,
        staleTime: 1000 * 60,
    })

    // --- ПРОФИЛЬ МАСТЕРА ---
    const { data: profile, isFetching: isProfileFetching } = useQuery<FullProfile | null>({
        queryKey: ["user-profile", session.user.id],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile ?? undefined,
    })

    // Оптимизированный расчет специализаций через Set
    const mySkillIds = React.useMemo(() =>
        new Set(profile?.skills.map(s => s.categoryId) || []),
        [profile])

    // Живая статистика
    const stats = React.useMemo(() => {
        const total = orders.length
        const matched = orders.filter(order =>
            order.categories.some(cat => mySkillIds.has(cat.categoryId))
        ).length
        return { total, matched, hidden: total - matched }
    }, [orders, mySkillIds])

    // Показываем глобальный лоадер только если нет даже серверных данных
    if (!currentLat && !initialOrders.length) return <LoadingState />

    return (
        <Container className="bg-slate-50/50 py-10 pb-32">
            <div className="space-y-10">
                <FeedHeader
                    userSkills={profile?.skills || []}
                    userId={session.user.id}
                    stats={stats}
                    isUpdating={isOrdersFetching || isProfileFetching}
                />

                <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {orders.length > 0 ? (
                        orders.map((order) => {
                            const isMatched = order.categories.some(c => mySkillIds.has(c.categoryId))
                            return (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    isMatched={isMatched}
                                />
                            )
                        })
                    ) : (
                        <EmptyState />
                    )}
                </div>
            </div>
        </Container>
    )
}

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center rotate-3 shadow-2xl animate-pulse">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10 stroke-[3]" />
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ZWORK / ENGINE</p>
                <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Загрузка ленты...</p>
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100 px-10 max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center">
                    <Inbox className="w-12 h-12 text-slate-200" />
                </div>
                <div className="space-y-2">
                    <p className="font-black text-4xl italic text-slate-900 uppercase tracking-tighter leading-none">
                        Тишина в эфире
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                        В этом радиусе пока нет заказов. Попробуйте выбрать другой город или увеличить расстояние.
                    </p>
                </div>
            </div>
        </div>
    )
}
