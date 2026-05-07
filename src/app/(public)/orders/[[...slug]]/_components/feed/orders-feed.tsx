"use client"

import * as React from "react"
import { useQuery, useInfiniteQuery, keepPreviousData } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { Loader2 } from "lucide-react"

import { cn, handleAction } from "@/lib/utils"

// Components
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton"

// Types
import { FeedContext } from "../../page"
import { getOrders, GetOrdersResponse } from "@/actions/order/get"

/**
 * ИЗОЛИРОВАННЫЙ ТРИГГЕР СКРОЛЛА
 * Этот компонент рендерится при каждом входе/выходе из вьюпорта, 
 * НЕ затрагивая основной список заказов.
 */
const ScrollObserver = React.memo(({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetching,
    allOrdersLength
}: {
    hasNextPage: boolean | undefined,
    fetchNextPage: () => void,
    isFetchingNextPage: boolean,
    isFetching: boolean,
    allOrdersLength: number
}) => {
    const { ref, inView } = useInView({
        threshold: 0.1,
        rootMargin: '400px',
    });

    React.useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage && !isFetching) {
            console.log("🚀 [ACTION] Triggering next page...");
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage]);

    return (
        <div ref={ref} className="min-h-[200px] w-full flex flex-col items-center justify-center py-10">
            {isFetchingNextPage ? (
                <div className="w-full space-y-10 animate-in fade-in">
                    <OrderCardSkeleton />
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mt-4 mx-auto" />
                </div>
            ) : (
                !hasNextPage && allOrdersLength > 0 && (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="h-[1px] w-12 bg-slate-100" />
                        <p className="text-sm italic font-light tracking-wide">Все заказы загружены</p>
                    </div>
                )
            )}
        </div>
    );
});

export const OrdersFeed = React.memo(function OrdersFeed() {
    console.log("📦 [RENDER] OrdersFeed");

    const { data: context } = useQuery<FeedContext>({
        queryKey: ['feed-context'],
        enabled: false,
        queryFn: () => { throw new Error("Observer: feed-context is missing in cache") },

    });

    const {
        data,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ["orders", "list", context],
        queryFn: ({ pageParam }) =>
            handleAction(getOrders({
                ...context!,
                cursor: pageParam as string,
                mode: 'list'
            })),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: GetOrdersResponse<'list'>) => lastPage.nextCursor,
        enabled: !!context,
        notifyOnChangeProps: ['data', 'isFetching', 'isFetchingNextPage'],
        placeholderData: keepPreviousData,
    })

    const allOrders = React.useMemo(() => {
        const orders = data?.pages.flatMap((page) => page.orders) ?? [];
        if (orders.length > 0) console.log(`📋 [DATA] Orders displayed: ${orders.length}`);
        return orders;
    }, [data?.pages]);

    const isInitialLoading = isFetching && allOrders.length === 0;
    const isRefreshing = isFetching && !isFetchingNextPage && allOrders.length > 0;

    if (allOrders.length === 0 && !isFetching) {
        return <EmptyState />
    }
    console.log(isRefreshing)
    return (
        <div className="relative min-h-[600px]">
            {/* Оверлей при обновлении */}
            {isRefreshing && (
                <div className="absolute inset-x-0 top-0 z-20 flex justify-center pointer-events-none">
                    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-xs font-medium text-slate-600">Обновление...</span>
                    </div>
                </div>
            )}

            {/* Скелетоны первого экрана */}
            {isInitialLoading && (
                <div className="space-y-10">
                    {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
                </div>
            )}

            {/* Сетка заказов */}
            <div className={cn(
                "grid gap-10 transition-all duration-500",
                isRefreshing ? "opacity-50 grayscale-[0.3] blur-[1px]" : "opacity-100 blur-0"
            )}>
                {allOrders.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        isMatch={order.isMatch} />
                ))}
            </div>

            {/* Триггер скролла вынесен в отдельный компонент */}
            <ScrollObserver
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isFetching={isFetching}
                allOrdersLength={allOrders.length}
            />
        </div>
    )
});
