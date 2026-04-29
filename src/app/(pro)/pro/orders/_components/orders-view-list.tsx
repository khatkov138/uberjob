"use client"

import { cn } from "@/lib/utils"
import { OrderCard } from "./order-card"
import { EmptyState } from "./empty-state"
import { FeedOrder } from "@/actions/order/get"

export interface ViewComponentProps {
    orders: FeedOrder[]
    isFetching: boolean
    mySkillIds: Set<string>
}

export function OrdersViewList({ orders, isFetching, mySkillIds }: ViewComponentProps) {
    return (
        <div className={cn(
            "grid gap-8 transition-all duration-500",
            isFetching ? "opacity-30 blur-sm scale-[0.99] pointer-events-none" : "opacity-100"
        )}>
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
            ) : !isFetching && <EmptyState />}
        </div>
    )
}
