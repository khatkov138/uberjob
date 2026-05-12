"use client"

import * as React from "react"
import { useQuery, useInfiniteQuery, keepPreviousData, useIsFetching, InfiniteData, useQueryClient } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { ArrowUpRight, Loader2, RefreshCcw, Zap } from "lucide-react"

import { cn, handleAction, unwrap } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

// Components
import { OrderCard } from "./order-card"
import { EmptyState } from "../shared/empty-state"
import { OrderCardSkeleton } from "../shared/order-card-skeleton"

// Types
import { FeedContext } from "../../page"
import { getOrders, GetOrdersResponse } from "@/actions/order/get-feed"


import { useActiveFeed, useOrdersStream } from "../layout/FeedController"

/**
 * ИЗОЛИРОВАННЫЙ ТРИГГЕР СКРОЛЛА
 * Используем key={allOrdersLength} для принудительного ремаунта.
 * Это гарантирует, что если после загрузки страницы триггер всё еще в зоне видимости,
 * он сработает повторно без необходимости двигать скролл.
 */
const ScrollObserver = React.memo(({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage, // Передаем извне
    isError
}: {
    hasNextPage: boolean | undefined,
    fetchNextPage: () => void,
    isFetchingNextPage: boolean,
    isError: boolean
}) => {


    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '600px' // Чуть увеличим для плавности
    });

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



// Выносим счетчик в глобал, чтобы он не обнулялся никогда
let globalOrdersFeedRenderCount = 0;

export const OrdersFeed = React.memo(function OrdersFeed() {
    globalOrdersFeedRenderCount++;
    const context = useActiveFeed();
    const queryClient = useQueryClient();

    const ordersStream = useOrdersStream();
    const serverDataRaw = React.use(ordersStream);

    // ЗАТВОР ДЛЯ СМЕНЫ ФИЛЬТРОВ: Запоминаем самый первый контекст, с которым страница родилась на сервере
    const initialContextRef = React.useRef(context);

    // Если текущий контекст (радиус, slug, категория) перестал быть равен начальному — значит, юзер крутит фильтры!
    const isFiltersChanged = initialContextRef.current !== context;

    const queryKey = ['orders', 'list', context];

    const query = useInfiniteQuery<GetOrdersResponse<'list'>>({
        queryKey,
        queryFn: ({ pageParam }) => handleAction(getOrders({ ...context, cursor: pageParam as string, mode: 'list' })),
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!context,
        placeholderData: keepPreviousData,

        // Указываем тип возвращаемого значения с возможностью вернуть undefined для смены фильтров
        initialData: (): InfiniteData<GetOrdersResponse<'list'>> | undefined => {
            // 1. Если данные по этому ключу уже есть в кэше (вернулись на старый фильтр) — берем их
            const cached = queryClient.getQueryData<InfiniteData<GetOrdersResponse<'list'>>>(queryKey);
            if (cached) return cached;

            // 2. ДИФФ-ЗАВОР: Если юзер изменил радиус или категорию, мы ГАРАНТИРОВАННО 
            // возвращаем undefined. Это заставит Танстек пойти в сеть (queryFn) за новыми данными!
            if (isFiltersChanged) return undefined;

            // 3. Если это самый первый «холодный» запуск страницы — берем серверный стрим
            const unwrapped = unwrap(serverDataRaw, { orders: [], nextCursor: null, total: 0 });
            const initialOrders = unwrapped as GetOrdersResponse<'list'>;

            return {
                pages: [initialOrders],
                pageParams: [undefined]
            };
        },

        // Чтобы при смене фильтров Танстек сразу давал сигнал хедерам и скелетонам через isFetching
        notifyOnChangeProps: ['data', 'hasNextPage', 'isFetching'],
        staleTime: 1000 * 60,
        structuralSharing: true
    });

    const { allOrders, total } = React.useMemo(() => {
        const pages = query.data?.pages || [];
        return {
            allOrders: pages.flatMap((page) => page.orders),
            total: pages[0]?.total ?? 0
        };
    }, [query.data]);

    const ordersCount = allOrders.length;

    console.log(`📦 [RENDER #${globalOrdersFeedRenderCount}] OrdersFeed | Total: ${total} | Loaded: ${ordersCount}, isFetching: ${query.isFetching}`);

    if (ordersCount === 0) return <EmptyState />;


    return (
        <div className="relative min-h-[600px]">
            {/* ГРУППИРОВКА СПИСКА ДЛЯ ИЗОЛИРОВАННОГО БЛЮРА */}
            <div className={cn(
                "grid gap-10 transition-all duration-700 ease-in-out", // Чуть медленнее для "дорогого" эффекта

                "opacity-100 blur-0 grayscale-0 scale-100"
            )}>
                {allOrders.map((order) => (
                    <OrderCard key={order.id} order={order} isMatch={order.isMatch} />
                ))}
            </div>

            {/* Бесконечный скролл (ВНЕ зоны блюра) */}

            <ScrollObserver
                key={`trigger-${ordersCount}`}
                hasNextPage={query.hasNextPage}
                fetchNextPage={query.fetchNextPage}
                isFetchingNextPage={query.isFetchingNextPage} // Нативный флаг TanStack
                isError={query.isError}
            />

            {/* Финальный блок (The End) — тоже не должен блюриться */}
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
