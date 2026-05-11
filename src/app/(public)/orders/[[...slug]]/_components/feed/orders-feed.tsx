"use client"

import * as React from "react"
import { useQuery, useInfiniteQuery, keepPreviousData, useIsFetching, InfiniteData } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { ArrowUpRight, Loader2, RefreshCcw, Zap } from "lucide-react"

import { cn, handleAction } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

// Components
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton"

// Types
import { FeedContext } from "../../page"
import { getOrders, GetOrdersResponse } from "@/actions/order/get-feed"

import { useFeedStatsStore } from "@/store/use-feed-stats"
import { useActiveFeed } from "../layout/FeedController"

/**
 * ИЗОЛИРОВАННЫЙ ТРИГГЕР СКРОЛЛА
 * Используем key={allOrdersLength} для принудительного ремаунта.
 * Это гарантирует, что если после загрузки страницы триггер всё еще в зоне видимости,
 * он сработает повторно без необходимости двигать скролл.
 */
const ScrollObserver = React.memo(({
    context,
    hasNextPage,
    fetchNextPage,
    isError
}: {
    context: FeedContext | null,
    hasNextPage: boolean | undefined,
    fetchNextPage: () => void,
    isError: boolean
}) => {
    // 1. Следим за сетевым статусом именно этого запроса
    const isFetchingCount = useIsFetching({
        queryKey: ["orders", "list", context]
    });
    const isFetchingNextPage = isFetchingCount > 0;

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '400px'
    });

    // 2. Авто-загрузка при скролле (только если нет ошибки)
    React.useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage && !isError) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

    if (!hasNextPage && !isError) return null;

    return (
        <div ref={ref} className="w-full py-20 flex flex-col items-center justify-center">

            {/* СОСТОЯНИЕ ОШИБКИ */}
            {isError ? (
                <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="h-[2px] w-12 bg-red-500/20" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">SYNC / FAILED</span>
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        </div>
                        <div className="h-[2px] w-12 bg-red-500/20" />
                    </div>

                    <div className="text-center space-y-2">
                        <h4 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                            Ошибка <span className="text-red-500">связи</span>
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
                            Проверьте интернет и попробуйте снова
                        </p>
                    </div>

                    <button
                        disabled={isFetchingNextPage}
                        onClick={() => fetchNextPage()}
                        className={cn(
                            "group flex items-center gap-6 px-10 py-6 rounded-[2.5rem] transition-all duration-500",
                            "bg-slate-900 text-white font-black uppercase italic tracking-tighter text-xl shadow-xl",
                            "hover:scale-[1.02] active:scale-95 hover:bg-red-500 disabled:opacity-50 disabled:grayscale"
                        )}
                    >
                        {isFetchingNextPage ? (
                            <>
                                <span>Загрузка...</span>
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </>
                        ) : (
                            <>
                                <span>Повторить</span>
                                <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                                    <RefreshCcw className="w-6 h-6" />
                                </div>
                            </>
                        )}
                    </button>
                </div>
            ) : (
                /* СТАНДАРТНЫЙ ЛОАДЕР (при скролле) */
                isFetchingNextPage && (
                    <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-1 h-1 bg-blue-600 rounded-full animate-ping" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">
                                Next / Batch
                            </span>
                        </div>
                    </div>
                )
            )}
        </div>
    );
});



export const OrdersFeed = React.memo(function OrdersFeed() {
    const renderCount = React.useRef(0);
    const context = useActiveFeed();

   
    const query = useInfiniteQuery<GetOrdersResponse<'list'>>({
        queryKey: ['orders', 'list', context],
        queryFn: ({ pageParam }) => handleAction(getOrders({ ...context, cursor: pageParam as string, mode: 'list' })),
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!context,
        placeholderData: keepPreviousData,
        notifyOnChangeProps: ['data', 'hasNextPage', 'isError'], // Добавили isFetching для индикатора
        structuralSharing: true,
        staleTime: 1000 * 60,
    });

    const { allOrders, total } = React.useMemo(() => {
        const pages = query.data?.pages || [];
        return {
            allOrders: pages.flatMap((page) => page.orders),
            total: pages[0]?.total ?? 0
        };
    }, [query.data]);

   

    const ordersCount = allOrders.length;
    renderCount.current++;

    console.log(`📦 [RENDER #${renderCount.current}] OrdersFeed | Total: ${total} | Loaded: ${ordersCount}`);

    if (ordersCount === 0 && !query.isFetching) return <EmptyState />;

    return (
        <div className="relative min-h-[600px]">
            {/* Список карточек */}
            <div className="grid gap-10 transition-all duration-500">
                {allOrders.map((order) => (
                    <OrderCard key={order.id} order={order} isMatch={order.isMatch} />
                ))}
            </div>

            {/* Бесконечный скролл */}
            <ScrollObserver
                key={`trigger-${ordersCount}`}
                context={context}
                hasNextPage={query.hasNextPage}
                fetchNextPage={query.fetchNextPage}
                isError={query.isError}
            />

            {/* Финальный блок (The End) */}
            {!query.hasNextPage && ordersCount > 0 && (
                <div className="flex flex-col items-center gap-8 py-24 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="flex items-center gap-4">
                        <div className="h-[2px] w-12 bg-slate-900/10" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">END / REACHED</span>
                            <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                        </div>
                        <div className="h-[2px] w-12 bg-slate-900/10" />
                    </div>

                    <div className="text-center space-y-4">
                        <h4 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.8]">
                            Поздравляем, <br />
                            <span className="text-blue-600">вы достигли дна</span>
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] italic text-slate-400">
                            Больше заказов нет. Время всплывать.
                        </p>
                    </div>

                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="group flex items-center gap-6 px-10 py-6 bg-slate-900 text-white rounded-[2.5rem] hover:bg-blue-600 transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
                    >
                        <span className="text-xl font-black uppercase italic tracking-tighter">Наверх</span>
                        <div className="p-2 bg-white/10 rounded-xl">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
});
