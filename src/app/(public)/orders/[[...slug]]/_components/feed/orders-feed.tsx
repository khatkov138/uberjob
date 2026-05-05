"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

// Hooks & Stores
import { useOrdersStore } from "@/store/use-orders-store"
import { useUserSkills } from "@/hooks/use-user-skills"

// Components
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton"
import { FeedContext } from "../../page"
import { FeedOrder } from "@/actions/order/get"

export function OrdersFeed() {
    const { radius } = useOrdersStore()
    const { isMatched } = useUserSkills()

    // 1. Достаем контекст локации (уже есть в кеше)
    // Достаем контекст локации из пассивного кеша
    const { data: location } = useQuery<FeedContext>({
        queryKey: ['current-location'],
        // Заглушка для TS
        queryFn: () => { throw new Error("Location cache missing") },
        // Мы только читаем, никогда не запрашиваем
        enabled: false,
        staleTime: Infinity
    })

    // 2. Формируем ТОЧНО ТАКОЙ ЖЕ ключ, как в PageClient
    const activeParams = React.useMemo(() => {
        if (!location) return null
        return {
            ...location,
            radius: radius,
            categoryId: location.categoryId || null
        }
    }, [location, radius])

    // 3. Просто подписываемся на данные. queryFn НЕ НУЖНА.
    // TanStack Query поймет, что раз ключ совпадает, нужно брать данные из кеша, 
    // который наполняет OrdersPageClient.
    const { data: orders = [], isFetching } = useQuery<FeedOrder[]>({
        queryKey: ["orders", activeParams],
        enabled: !!activeParams, // Слушаем, только когда ключ готов
        staleTime: Infinity,
        queryFn: () => { throw new Error("Observer query should not fetch") },
    })

    if (orders.length === 0 && !isFetching) {
        return <EmptyState />
    }

    return (
        <div className="relative min-h-[600px]">
            {isFetching && (
                <div className="absolute inset-0 z-20 space-y-10 animate-in fade-in duration-500">
                    {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
                </div>
            )}

            <div className={cn(
                "grid gap-10 transition-all duration-700",
                isFetching ? "opacity-0 blur-2xl" : "opacity-100 blur-0"
            )}>
                {orders.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        isMatched={isMatched(order.categories.map(c => c.categoryId))}
                    />
                ))}
            </div>
        </div>
    )
}
