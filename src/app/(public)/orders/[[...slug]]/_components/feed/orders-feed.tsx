"use client"

import { cn } from "@/lib/utils"
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton"
import { FeedOrder } from "@/actions/order/get"

interface Props {
    orders: FeedOrder[]
    isFetching: boolean
    mySkillIds: Set<string>
}

export function OrdersFeed({ orders, isFetching, mySkillIds }: Props) {
    if (orders.length === 0 && !isFetching) {
        return <EmptyState />
    }

    return (
        /* 1. Убрали p-6 md:p-8. Теперь список занимает всю доступную ширину */
        <div className="relative min-h-[600px]">
            
            {/* ГРУППА СКЕЛЕТОНОВ: Синхронизируем отступы и gap со списком */}
            {isFetching && (
                <div className="absolute inset-0 z-20 space-y-10 animate-in fade-in duration-500">
                    {[1, 2, 3].map((i) => (
                        <OrderCardSkeleton key={`skeleton-${i}`} />
                    ))}
                </div>
            )}

            {/* ОСНОВНОЙ СПИСОК */}
            <div className={cn(
                /* 2. Увеличили gap до 10 для большего объема */
                "grid gap-10 transition-all duration-700",
                isFetching ? "opacity-0 blur-2xl scale-[0.98] pointer-events-none" : "opacity-100 blur-0 scale-100"
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
