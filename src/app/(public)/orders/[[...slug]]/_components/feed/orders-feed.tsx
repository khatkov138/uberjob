"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

// Hooks
import { useUserSkills } from "@/hooks/use-user-skills"

// Components
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton"

// Types
import { FeedContext } from "../../page"
import { FeedOrder, getOrders } from "@/actions/order/get"
import { handleAction } from "@/lib/utils"

export function OrdersFeed() {
    const { isMatched } = useUserSkills()

    // 1. Достаем актуальный контекст (уже синхронизированный в PageUI)
    const { data: context } = useQuery<FeedContext>({
        queryKey: ['feed-context'],
        staleTime: Infinity,
        // Оставляем заглушку для TS, хотя данные уже в кеше
        queryFn: () => { throw new Error("Context missing") },
    })

    // 2. Подписываемся на заказы
    // Мы используем ту же queryFn, что и в PageUI. 
    // TanStack Query объединит эти запросы в один (deduplication).
    const { data: orders = [], isFetching } = useQuery<FeedOrder[]>({
        queryKey: ["orders", context],
        queryFn: () => context
            ? handleAction(getOrders({ ...context, limit: 15 }))
            : Promise.resolve([]),
        enabled: !!context,
       
    })

    // 3. Обработка пустого состояния
    if (orders.length === 0 && !isFetching) {
        return <EmptyState />
    }

    return (
        <div className="relative min-h-[600px]">
            {/* Скелетоны: показываем только при первой загрузке или смене города, 
                когда старых данных нет, а новые грузятся */}
            {isFetching && orders.length === 0 && (
                <div className="space-y-10 animate-in fade-in duration-500">
                    {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
                </div>
            )}

            <div className={cn(
                "grid gap-10 transition-all duration-700",
                // Если данные есть, но идет фоновое обновление (например, радиус)
                // мы не скрываем список, а мягко его "блюрим"
                isFetching && orders.length > 0 ? "opacity-40 blur-sm pointer-events-none" : "opacity-100 blur-0"
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
