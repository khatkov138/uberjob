"use client"

import * as React from "react"
import { useQuery, useInfiniteQuery, keepPreviousData } from "@tanstack/react-query"
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

/**
 * ИЗОЛИРОВАННЫЙ ТРИГГЕР СКРОЛЛА
 * Используем key={allOrdersLength} для принудительного ремаунта.
 * Это гарантирует, что если после загрузки страницы триггер всё еще в зоне видимости,
 * он сработает повторно без необходимости двигать скролл.
 */
const ScrollObserver = React.memo(({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
}: {
    hasNextPage: boolean | undefined,
    fetchNextPage: () => void,
    isFetchingNextPage: boolean,

}) => {
    // Порог 0 и небольшой margin для мгновенной реакции
    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '100px',
    });

    React.useEffect(() => {
        // Если триггер виден и есть что грузить — стреляем немедленно
        if (inView && hasNextPage && !isFetchingNextPage) {
            console.log("🚀 [SCROLL] Triggering next page...");
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div ref={ref} className="h-32 w-full flex items-center justify-center py-10">
            {isFetchingNextPage && (
                <div className="flex flex-col items-center gap-4 animate-in fade-in">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic opacity-50">
                        Подгрузка данных...
                    </span>
                </div>
            )}
        </div>
    );
});

export const OrdersFeed = React.memo(function OrdersFeed() {
    const renderCount = React.useRef(0);
    renderCount.current++;
    console.log(`📦 [RENDER #${renderCount.current}] OrdersFeed`);

    // 1. ПАССИВНЫЙ ОБСЕРВЕР ШИНЫ (С заглушкой для корректной работы v5)
    const { data: context } = useQuery<FeedContext>({
        queryKey: ['feed-context'],
        enabled: false,
        queryFn: () => ({} as FeedContext),
    });

    // 2. ДЕБАУНС КОНТЕКСТА (Для стабилизации фильтров)
    const debouncedContext = useDebounce(context, 400);

    // 3. БОЕВОЙ INFINITE QUERY
    const {
        data: allOrders,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ["orders", "list", debouncedContext],
        queryFn: ({ pageParam }) => {
            console.log("🔥 [QUERY] API Call executed", { cursor: pageParam });
            return handleAction(getOrders({
                ...debouncedContext!,
                cursor: pageParam as string,
                mode: 'list'
            }));
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: GetOrdersResponse<'list'>) => lastPage.nextCursor,
        enabled: !!debouncedContext,
        placeholderData: keepPreviousData,
        // Уведомляем только о данных и статусе подгрузки
        notifyOnChangeProps: ['data', 'isFetchingNextPage'],
        select: (data) => {
            const orders = data.pages.flatMap((page) => page.orders);
            console.log(`📋 [DATA] Select updated: ${orders.length} orders`);
            return orders;
        }
    })

    const ordersCount = allOrders?.length ?? 0;
    const isRefreshing = isFetching && !isFetchingNextPage && ordersCount > 0;

    if (ordersCount === 0 && !isFetching) {
        return <EmptyState />
    }

    return (
        <div className="relative min-h-[600px]">
            {/* Основной список заказов */}
            <div className={cn(
                "grid gap-10 transition-all duration-500",
                isRefreshing ? "opacity-50 grayscale blur-[1px] pointer-events-none scale-[0.99]" : "opacity-100 scale-100"
            )}>
                {allOrders?.map((order, i) => (

                    <OrderCard
                        key={order.id}
                        order={order}
                        isMatch={order.isMatch}
                    />

                ))}
            </div>

            {/* 
                ФИЗИЧЕСКИЙ ТРИГГЕР: 
                key={ordersCount} заставляет компонент пересоздаваться при каждом изменении количества заказов.
                Это решает проблему "залипания" скролла, когда данные подгрузились, 
                но пользователь всё еще видит дно ленты.
            */}
            <ScrollObserver
                key={ordersCount}
                hasNextPage={hasNextPage}
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}

            />

            {/* Финальный бейдж конца ленты */}
            {!hasNextPage && ordersCount > 0 && (
                <div className="flex flex-col items-center gap-8 py-24 animate-in fade-in slide-in-from-bottom-10 duration-1000">

                    {/* Стандарт PRO / HUB */}
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

                    {/* Кнопка в стиле твоих карточек Дашборда */}
                    <button
                        onClick={(e) => {
                            // 1. Ищем ближайший элемент, у которого включен скролл
                            const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
                                if (!el) return null;
                                if (el.scrollHeight > el.clientHeight) return el;
                                return findScrollParent(el.parentElement);
                            };

                            const scrollParent = findScrollParent(e.currentTarget);

                            if (scrollParent) {
                                scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
                                console.log("🚀 [UI] Нашли скролл-родителя и всплыли!");
                            } else {
                                // План Б: если DOM-дерево слишком сложное
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                document.body.scrollTo({ top: 0, behavior: 'smooth' });
                                document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                            }
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
    )
});
