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
    const renderCount = React.useRef(0);
    renderCount.current++;
    console.log(`📦 [RENDER #${renderCount.current}] OrdersFeed`);

    // 1. ПАССИВНЫЙ ОБСЕРВЕР (Заглушка, чтобы не было ошибки No queryFn)
    const { data: context } = useQuery<FeedContext>({
        queryKey: ['feed-context'],
        enabled: false, // Хук никогда не запустит queryFn сам
        queryFn: () => {
            console.warn("⚠️ [BUS] queryFn called (should not happen with enabled: false)");
            return {} as FeedContext;
        },
        select: (s) => s
    });

    if (context) {
        console.log(`📡 [BUS #${renderCount.current}] Context linked:`, context.viewMode);
    }

    // 2. БОЕВОЙ INFINITE QUERY (Реальная функция)
    const {
        data: allOrders,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ["orders", "list", context],
        queryFn: ({ pageParam }) => {
            console.log("🔥 [QUERY] fetchNextPage/Initial fetch triggered...");
            return handleAction(getOrders({
                ...context!,
                cursor: pageParam as string,
                mode: 'list'
            }));
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: GetOrdersResponse<'list'>) => lastPage.nextCursor,
        enabled: !!context,
        notifyOnChangeProps: ['data', 'isFetching', 'isFetchingNextPage'],
        placeholderData: keepPreviousData,
        select: (data) => {
            const orders = data.pages.flatMap((page) => page.orders);
            console.log(`📋 [DATA #${renderCount.current}] Select: ${orders.length} orders found`);
            return orders;
        }
    })

    const ordersCount = allOrders?.length ?? 0;
    const isInitialLoading = isFetching && ordersCount === 0;
    const isRefreshing = isFetching && !isFetchingNextPage && ordersCount > 0;

    console.log(`📊 [STATE #${renderCount.current}] count: ${ordersCount}, fetching: ${isFetching}`);

    if (ordersCount === 0 && !isFetching) {
        return <EmptyState />
    }

    return (
        <div className="relative min-h-[600px]">
            {/* Твой UI (Overlay, Skeletons, Grid) */}
            <div className={cn(
                "grid gap-10 transition-all duration-500",
                isRefreshing ? "opacity-50 grayscale-[0.3] blur-[1px]" : "opacity-100 blur-0"
            )}>
                {allOrders?.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        isMatch={order.isMatch} />
                ))}
            </div>

            <ScrollObserver
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isFetching={isFetching}
                allOrdersLength={ordersCount}
            />
        </div>
    )
});
