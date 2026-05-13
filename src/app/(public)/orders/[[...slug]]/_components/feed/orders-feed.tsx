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
import { ActionResponse } from "@/lib/server-utils"

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


let connectorRenderCount = 0;
let coreRenderCount = 0;


/**
 * 1. КОННЕКТОР (Связующий слой)
 */
export const OrdersFeed = React.memo(function OrdersFeed() {
    connectorRenderCount++;

    const context = useActiveFeed();
    const ordersStream = useOrdersStream<'list'>();

    const queryClient = useQueryClient();
    const queryKey = React.useMemo(() => ['orders', 'list', context] as const, [context]);

    const hasCachedData = !!queryClient.getQueryData(queryKey);
    const serverDataRaw = hasCachedData ? null : React.use(ordersStream);

    // ⚡️ СКОЛЬЗЯЩИЙ ЗАТВОР ПО ЗНАЧЕНИЮ (Сериализуем контекст в плоский хэш)
    const currentContextHash = React.useMemo(() => JSON.stringify(context), [context]);
    const prevContextHashRef = React.useRef(currentContextHash);

    // Фильтры реально изменились, если хэш текущих параметров не совпадает с прошлым сохраненным
    // И в оперативной памяти Танстека под этот ключ еще абсолютно пусто
    const isFiltersChanged = !hasCachedData && prevContextHashRef.current !== currentContextHash;

    // Синхронизируем скользящий затвор строго в тот момент, когда данные успешно прогрузились в RAM
    if (hasCachedData && prevContextHashRef.current !== currentContextHash) {
        prevContextHashRef.current = currentContextHash;
    }

    console.log(`🔌 [RENDER #${connectorRenderCount}] OrdersFeedConnector | FiltersChanged: ${isFiltersChanged} | StreamBypassed: ${hasCachedData} | Radius/Filter: ${currentContextHash}`);

    return (
        <OrdersFeedCore
            queryKey={queryKey}
            context={context}
            isFiltersChanged={isFiltersChanged}
            serverDataRaw={serverDataRaw}
        />
    );
});

interface OrdersFeedCoreProps {
    queryKey: readonly ['orders', 'list', ReturnType<typeof useActiveFeed>];
    context: ReturnType<typeof useActiveFeed>;
    isFiltersChanged: boolean;
    // ⚡️ Добавляем null в объединение типов (Union Type)
    serverDataRaw: ActionResponse<GetOrdersResponse<"list">> | null;
}
/**
 * 2. ЯДРО ФИДА (Слой рендеринга и работы с кэшем)
 */
const OrdersFeedCore = React.memo(function OrdersFeedCore({
    queryKey,
    context,
    isFiltersChanged,
    serverDataRaw
}: OrdersFeedCoreProps) {
    coreRenderCount++;

    // Инициализируем хук. Заправка происходит легально и атомарно на фазе инициализации.
    const query = useInfiniteQuery<GetOrdersResponse<'list'>, Error, InfiniteData<GetOrdersResponse<'list'>>, typeof queryKey>({
        queryKey,
        queryFn: async ({ pageParam }) => {
            console.log('📍handleAction📍 getOrders 📍');
            return handleAction(
                getOrders({ ...context, cursor: pageParam as string, mode: 'list' })
            );
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!context,
        placeholderData: keepPreviousData,

        // 🧱 ДЕКЛАРАТИВНЫЙ ЗАТВОР (Заменяет Шаг 1 и старый initialData)
        initialData: (): InfiniteData<GetOrdersResponse<'list'>> | undefined => {
            if (isFiltersChanged || !serverDataRaw) return undefined;

            // Вызывается только на холодном старте, когда serverDataRaw гарантированно существует
            const unwrapped = unwrap(serverDataRaw, { orders: [], nextCursor: null, total: 0 });
            return {
                pages: [unwrapped],
                pageParams: [undefined]
            };
        },

        notifyOnChangeProps: ['data', 'hasNextPage'],
        staleTime: 1000 * 60,
        structuralSharing: true
    });

    // Безопасная деструктуризация страниц. 
    const pages = query.data?.pages || [{ orders: [], nextCursor: null, total: 0 }];

    // Абсолютно чистый useMemo завязанный на примитив длины массива страниц и тотал
    const { allOrders, total } = React.useMemo(() => {

        return {
            allOrders: pages.flatMap((page) => page.orders),
            total: pages[0]?.total ?? 0
        };
    }, [pages.length, pages[0]?.total]); // Точечные примитивы исключают CPU-Throttling

    const ordersCount = allOrders.length;

    console.log(`📦 [RENDER #${coreRenderCount}] OrdersFeedCore | Total: ${total} | Loaded: ${ordersCount} | cursor: ${query.data?.pages[0].nextCursor} `);

    if (ordersCount === 0) return <EmptyState />;

    return (
        <div className="relative min-h-[600px]">
            {/* СПИСОК С БЛЮРОМ */}
            <div className={cn(
                "grid gap-10 transition-all duration-700 ease-in-out",
                "opacity-100 blur-0 grayscale-0 scale-100"
            )}>
                {allOrders.map((order) => (
                    <OrderCard key={order.id} order={order} isMatch={order.isMatch} />
                ))}
            </div>

            {/* 🔥 ИЗОЛИРОВАННЫЙ НАБЛЮДАТЕЛЬ СКРОЛЛА */}
            {/* Передаем queryKey, чтобы наблюдатель сам точечно подписался на статус фетчинга */}
            <IsolatedScrollObserver
                queryKey={queryKey}
                ordersCount={ordersCount}
                hasNextPage={!!query.hasNextPage}
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
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
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

interface IsolatedScrollObserverProps {
    queryKey: readonly ['orders', 'list', ReturnType<typeof useActiveFeed>];
    ordersCount: number;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    isError: boolean;
}

/**
 * 3. АТОМАРНЫЙ ТРИГГЕР СКРОЛЛА
 * Он забирает флаг фетчинга точечно через useIsFetching.
 * При подгрузке страниц рендерится ТОЛЬКО этот маленький компонент, а ядро фида молчит.
 */
const IsolatedScrollObserver = React.memo(function IsolatedScrollObserver({
    queryKey,
    ordersCount,
    hasNextPage,
    fetchNextPage,
    isError
}: IsolatedScrollObserverProps) {
    // Получаем количество фетчей конкретно по нашему ключу (0 или 1)
    const isFetching = useIsFetching({ queryKey: queryKey as unknown as any[] }) > 0;

    return (
        <ScrollObserver
            key={`trigger-${ordersCount}`}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={isFetching} // Отдаем изолированный флаг
            isError={isError}
        />
    );
});