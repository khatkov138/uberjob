"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Inbox } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { useLocationStore } from "@/store/use-location-store"
import { getOrders, FeedOrder } from "@/actions/orders/orders"
import { addSkill, getMyProfile, removeSkill, FullProfile } from "@/actions/profile"
import { handleAction } from "@/lib/utils"

import { Container } from "@/components/shared/container"
import { LocationModal } from "@/components/geo/location-modal"
import { FeedHeader } from "./feed-header"
import { OrderCard } from "./order-card"

interface OrdersPageClientProps {
    initialOrders: FeedOrder[]
    initialProfile: FullProfile | null
}

export default function OrdersPageClient({ initialOrders, initialProfile }: OrdersPageClientProps) {
    const queryClient = useQueryClient()
    const { data: session } = authClient.useSession()
    const { lat, lng, radius } = useLocationStore()
    const [filterMode, setFilterMode] = React.useState<"ALL" | "MY">("ALL")

    // --- ЗАГРУЗКА ДАННЫХ ---

    const { data: orders = [] } = useQuery({
        queryKey: ["orders", lat, lng, radius, session?.user?.id],
        queryFn: () => handleAction(getOrders({ lat, lng, radius })),
        initialData: initialOrders,
        enabled: !!lat,
        staleTime: 0,
    })

    const { data: profile } = useQuery({
        queryKey: ["user-profile", session?.user?.id],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile,
        enabled: !!session?.user?.id,
    })

    // --- МУТАЦИИ (Снова красивые стрелки) ---

    const { mutate: handleAddSkill } = useMutation({
        mutationFn: (categoryId: string) => handleAction(addSkill(categoryId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-profile"] })
            queryClient.invalidateQueries({ queryKey: ["orders"] })
        },
    })

    const { mutate: handleRemoveSkill } = useMutation({
        mutationFn: (skillId: string) => handleAction(removeSkill(skillId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-profile"] })
            queryClient.invalidateQueries({ queryKey: ["orders"] })
        },
    })

    // --- ЛОГИКА ---

    const filteredOrders = React.useMemo(() => {
        return filterMode === "MY" ? orders.filter(o => o.isMatch) : orders
    }, [orders, filterMode])

    return (
        <Container className="bg-slate-50/50 py-10">
            <div className="space-y-10">
                <FeedHeader
                    userSkills={profile?.skills || []}
                    onAddSkill={handleAddSkill}
                    onRemoveSkill={handleRemoveSkill}
                    filterMode={filterMode}
                    setFilterMode={setFilterMode}
                />

                <div className="grid gap-8">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))
                    ) : (
                        <EmptyState isMyFilter={filterMode === "MY"} />
                    )}
                </div>


            </div>
        </Container>
    )
}

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-blue-600 w-10 h-10 stroke-[3]" />
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ZWORK / ENGINE</p>
                <p className="text-sm font-bold text-slate-600 italic tracking-tighter">Синхронизация...</p>
            </div>
        </div>
    )
}

function EmptyState({ isMyFilter }: { isMyFilter: boolean }) {
    return (
        <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 px-6">
            <div className="flex flex-col items-center gap-4">
                <Inbox className="w-12 h-12 text-slate-200" />
                <div className="space-y-1">
                    <p className="font-black text-2xl italic text-slate-900 uppercase tracking-tighter">
                        {isMyFilter ? "Нет совпадений" : "Здесь пусто"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {isMyFilter ? "Добавьте навыки выше" : "Измените радиус поиска"}
                    </p>
                </div>
            </div>
        </div>
    )
}
