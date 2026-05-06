"use client"

import * as React from "react"
import { useQuery, useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { Loader2 } from "lucide-react" // Используем стандартную иконку или свою

import { cn } from "@/lib/utils"

// Hooks
import { useUserSkills } from "@/hooks/use-user-skills"
// Components
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton"

// Types
import { FeedContext } from "../../page"
import { GetOrdersResponse } from "@/actions/order/get"

export function OrdersFeed() {

    const { data: context } = useQuery<FeedContext>({
        queryKey: ['feed-context'],
        queryFn: () => { throw new Error("Observer: context missing") },
        enabled: false,
    })

    const {
        data,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ["orders", "list", context],
        queryFn: () => { throw new Error("Observer: infinite data missing") },
        enabled: !!context,
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: GetOrdersResponse) => lastPage.nextCursor,
    })

    const { ref, inView } = useInView({
        threshold: 0.1,
        rootMargin: '100px', // Начинаем подгрузку чуть заранее
    })

    React.useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

    const allOrders = data?.pages.flatMap((page) => page.orders) ?? []

    // 1. Состояние "Первичная загрузка при пустом списке"
    const isInitialLoading = isFetching && allOrders.length === 0

    // 2. Состояние "Обновление фильтров" (когда список уже есть, но контекст изменился)
    const isRefreshing = isFetching && !isFetchingNextPage && allOrders.length > 0

    if (allOrders.length === 0 && !isFetching) {
        return <EmptyState />
    }

    return (
        <div className="relative min-h-[600px]">
            {/* Оверлей-лоадер при обновлении фильтров */}
            {isRefreshing && (
                <div className="absolute inset-x-0 top-10 z-20 flex justify-center pointer-events-none">
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-100 animate-in fade-in zoom-in duration-300">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-xs font-medium text-slate-600 tracking-wide">Обновление...</span>
                    </div>
                </div>
            )}

            {/* Скелетоны первой загрузки */}
            {isInitialLoading && (
                <div className="space-y-10 animate-in fade-in duration-500">
                    {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
                </div>
            )}

            {/* Контейнер списка */}
            <div className={cn(
                "grid gap-10 transition-all duration-700",
                // Блюрим только при полной перекачке списка (не при скролле)
                isRefreshing ? "opacity-50 blur-[2px] pointer-events-none" : "opacity-100 blur-0"
            )}>
                {allOrders.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        isMatch={order.isMatch} />
                ))}
            </div>

            {/* Нижняя зона: либо триггер скролла со скелетонами, либо финал списка */}
            <div ref={ref} className="py-16 flex flex-col items-center justify-center gap-6">
                {isFetchingNextPage ? (
                    <div className="w-full space-y-10 animate-in fade-in duration-300">
                        <OrderCardSkeleton />
                        <div className="flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                        </div>
                    </div>
                ) : (
                    <>
                        {!hasNextPage && allOrders.length > 0 && (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <div className="h-[1px] w-20 bg-slate-100" />
                                <p className="text-sm italic">Вы просмотрели все заказы</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
