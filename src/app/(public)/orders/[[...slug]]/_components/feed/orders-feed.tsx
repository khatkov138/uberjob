"use client"

import * as React from "react"
import { useQuery, useInfiniteQuery, keepPreviousData, useIsFetching, InfiniteData } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { ArrowUpRight, Loader2, Zap } from "lucide-react"

import { cn, handleAction } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

// Components
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton"

// Types
import { FeedContext } from "../../page"
import { getOrders, GetOrdersResponse } from "@/actions/order/get-feed"
import { useActiveFeed } from "../layout/feed-context-provider"
import { useFeedDataStore } from "@/store/use-feed-data-store"

/**
 * ИЗОЛИРОВАННЫЙ ТРИГГЕР СКРОЛЛА
 * Используем key={allOrdersLength} для принудительного ремаунта.
 * Это гарантирует, что если после загрузки страницы триггер всё еще в зоне видимости,
 * он сработает повторно без необходимости двигать скролл.
 */
const ScrollObserver = React.memo(({ context, hasNextPage, fetchNextPage }: {
    context: FeedContext | null,
    hasNextPage: boolean | undefined,
    fetchNextPage: () => void
}) => {
    // 1. Просто слушаем количество активных fetch-процессов для этого ключа
    // Это вернет 1, если идет fetchNextPage, и 0, если тишина.
    const isFetchingCount = useIsFetching({
        queryKey: ["orders", "list", context]
    });

    const isFetchingNextPage = isFetchingCount > 0;

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '200px'
    });

    React.useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div ref={ref} className="h-32 w-full flex items-center justify-center">
            {isFetchingNextPage && (
                <div className="flex flex-col items-center gap-4 animate-in fade-in">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic opacity-50">
                        ZWORK / LOADING...
                    </span>
                </div>
            )}
        </div>
    );
});

export const OrdersFeed = React.memo(function OrdersFeed() {
    const renderCount = React.useRef(0);
    const context = useActiveFeed();

    // 1. ПОЛНОСТЬЮ СЫРОЙ ЗАПРОС
    const query = useInfiniteQuery<
        GetOrdersResponse<'list'>,
        Error,
        InfiniteData<GetOrdersResponse<'list'>>,
        [string, string, FeedContext],
        string | undefined
    >({
        queryKey: ["orders", "list", context],
        queryFn: ({ pageParam }) => handleAction(getOrders({
            ...context,
            cursor: pageParam,
            mode: 'list'
        })),
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!context,
        placeholderData: keepPreviousData,
        notifyOnChangeProps: ['data', 'hasNextPage'],
        structuralSharing: true,
        // select: убран!
    });

    // 2. ТРАНСФОРМАЦИЯ ДАННЫХ ВНУТРИ РЕНДЕРА
    // Оборачиваем в useMemo, чтобы ссылки на заказы не менялись при каждом шуме
    const { allOrders, total } = React.useMemo(() => {
        const pages = query.data?.pages || [];
        return {
            allOrders: pages.flatMap((page) => page.orders),
            total: pages[0]?.total ?? 0
        };
    }, [query.data]);

    // 3. СИНХРОНИЗАЦИЯ С ХЕДЕРОМ (через Zustand мост)
    React.useEffect(() => {
        // Пишем в стор только когда данные реально есть
        useFeedDataStore.getState().setStats(total, query.isFetching);
    }, [total, query.isFetching]);

    const ordersCount = allOrders.length;
    const isRefreshing = query.isFetching && !query.isFetchingNextPage && ordersCount > 0;

    renderCount.current++;
    console.log(`📦 [RENDER #${renderCount.current}] OrdersFeed | Total: ${total}`);

    if (ordersCount === 0 && !query.isFetching) return <EmptyState />;

    return (
        <div className="relative min-h-[600px]">
            <div className={cn(
                "grid gap-10 transition-all duration-500",
                isRefreshing ? "opacity-50 grayscale blur-[1px]" : ""
            )}>
                {allOrders.map((order) => (
                    <OrderCard key={order.id} order={order} isMatch={order.isMatch} />
                ))}
            </div>

            <ScrollObserver
                key={`trigger-${ordersCount}`}
                context={context}
                hasNextPage={query.hasNextPage}
                fetchNextPage={query.fetchNextPage}
            />
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
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
                            Больше заказов нет. Время всплывать.
                        </p>
                    </div>

                    <button
                        onClick={(e) => {
                            const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
                                if (!el) return null;
                                if (el.scrollHeight > el.clientHeight) return el;
                                return findScrollParent(el.parentElement);
                            };
                            const scrollParent = findScrollParent(e.currentTarget);
                            (scrollParent || window).scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={cn(
                            "group flex items-center gap-6 px-10 py-6 rounded-[2.5rem] transition-all duration-500",
                            "bg-slate-900 text-white font-black uppercase italic tracking-tighter text-xl shadow-xl",
                            "hover:scale-[1.02] active:scale-95 hover:bg-blue-600 hover:shadow-blue-200"
                        )}
                    >
                        <span>Наверх</span>
                        <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
});
