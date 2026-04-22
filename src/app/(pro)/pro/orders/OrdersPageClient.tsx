"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Inbox } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { useLocationStore } from "@/store/use-location-store"
import { getOrders } from "@/actions/orders/orders"
import { addSkill, getMyProfile, removeSkill } from "@/actions/profile"

import { Container } from "@/components/shared/container"
import { LocationModal } from "@/components/geo/location-modal"
import { FeedHeader } from "./feed-header"
import { OrderCard } from "./order-card"
import { FeedOrder, FullProfile } from "@/lib/types"

interface OrdersPageClientProps {
    initialOrders: FeedOrder[]
    initialProfile: FullProfile
}


export default function OrdersPageClient({ initialOrders, initialProfile }: OrdersPageClientProps) {
    const queryClient = useQueryClient()

    // 1. Состояния из сессии и Zustand
    const { data: session } = authClient.useSession()
    const { lat, lng, radius } = useLocationStore()

    // Локальное состояние фильтра (Все / Мои ниши)
    const [filterMode, setFilterMode] = React.useState<"ALL" | "MY">("ALL")

    // --- 2. ЗАГРУЗКА ДАННЫХ (SSR + TanStack Query) ---

    // Лента заказов
    const { data: orders, isLoading: ordersLoading } = useQuery({
        queryKey: ["orders", lat, lng, radius, session?.user?.id],
        queryFn: () => getOrders(lat, lng, radius),
        initialData: initialOrders, // ТЕПЕРЬ ВСЁ РАБОТАЕТ САМО!
        enabled: !!lat,
    })

    // Профиль мастера
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ["user-profile", session?.user?.id],
        queryFn: () => getMyProfile(),
        initialData: initialProfile, // Прокидываем SSR данные
        enabled: !!session?.user?.id,
    })

    // --- 3. МУТАЦИИ (Сохранены полностью) ---

    const { mutate: handleAddSkill } = useMutation({
        mutationFn: addSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-profile"] })
            queryClient.invalidateQueries({ queryKey: ["orders"] })
        },
    })

    const { mutate: handleRemoveSkill } = useMutation({
        mutationFn: removeSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-profile"] })
            queryClient.invalidateQueries({ queryKey: ["orders"] })
        },
    })

    // --- 4. ОБРАБОТКА ДАННЫХ (БЕЗ ANY) ---

    const allOrders = orders || []

    const filteredOrders = filterMode === "MY"
        ? allOrders.filter((order) => order.isMatch)
        : allOrders

    // Показываем лоадер только если данных реально нет (ни в кэше, ни в SSR)
    const isLoading = (ordersLoading || profileLoading) && allOrders.length === 0

    if (isLoading) return <LoadingState />

    return (
        <Container className="bg-slate-50/50">
            <div className="space-y-10">

                {/* Шапка с фильтрами и управлением нишами */}
                <FeedHeader
                    userSkills={profile?.skills || []}
                    onAddSkill={handleAddSkill}
                    onRemoveSkill={handleRemoveSkill}
                    filterMode={filterMode}
                    setFilterMode={setFilterMode}
                />

                {/* Сетка заказов */}
                <div className="grid gap-8">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                isMatched={order.isMatch}
                            />
                        ))
                    ) : (
                        <EmptyState isMyFilter={filterMode === "MY"} />
                    )}
                </div>

                <LocationModal />
            </div>
        </Container>
    )
}

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-50/50 gap-4">
            <Loader2 className="animate-spin text-blue-600 w-12 h-12 stroke-[3]" />
            <div className="flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">ZWORK / SYSTEM</p>
                <p className="text-sm font-bold text-slate-600 italic">Синхронизируем ленту...</p>
            </div>
        </div>
    )
}

function EmptyState({ isMyFilter }: { isMyFilter: boolean }) {
    return (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm px-6">
            <div className="flex flex-col items-center gap-4">
                <Inbox className="w-12 h-12 text-slate-200" />
                <div className="space-y-1">
                    <p className="font-black text-xl italic text-slate-400 uppercase tracking-tighter">
                        {isMyFilter ? "Нет подходящих заказов" : "В этом районе пока тихо"}
                    </p>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest text-center">
                        {isMyFilter
                            ? "Добавьте больше навыков в панель выше"
                            : "Попробуйте изменить город или увеличить радиус"}
                    </p>
                </div>
            </div>
        </div>
    )
}
