"use client"

import { cn } from "@/lib/utils"
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton" // Импортируем
import { FeedOrder } from "@/actions/order/get"

interface Props {
    orders: FeedOrder[]
    isFetching: boolean
    mySkillIds: Set<string>
}

export function OrdersFeed({ orders, isFetching, mySkillIds }: Props) {
    // 1. Состояние полной пустоты (когда нет данных и нет загрузки)
    if (orders.length === 0 && !isFetching) {
        return <EmptyState />
    }

    return (
        <div className="relative min-h-[600px] p-6 md:p-8">
            {/* ГРУППА СКЕЛЕТОНОВ: Показываем только во время Fetching */}
            {isFetching && (
                <div className="absolute inset-0 z-20 p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
                    {[1, 2, 3].map((i) => (
                        <OrderCardSkeleton key={`skeleton-${i}`} />
                    ))}
                </div>
            )}

            {/* ОСНОВНОЙ СПИСОК */}
            <div className={cn(
                "grid gap-8 transition-all duration-700",
                // Если грузимся — блюрим старые данные, чтобы они служили фоном для скелетонов
                isFetching ? "opacity-0 blur-xl scale-[0.98] pointer-events-none" : "opacity-100 blur-0 scale-100"
            )}>
                {orders.map((order) => {
                    const isMatched = order.categories.some(c => mySkillIds.has(c.categoryId))
                    return (
                        <OrderCard
                            key={order.id}
                            order={order}
                            isMatched={isMatched}
                        />
                    )
                })}
            </div>
        </div>
    )
}
