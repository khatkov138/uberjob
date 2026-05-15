'use client';

import React, { useCallback, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData, type InfiniteData } from '@tanstack/react-query';
import { useQueryFeedContext, useOrdersStream } from '../providers/FeedController';
import { handleAction, unwrap } from '@/lib/utils';
import { getOrders, type GetOrdersResponse } from '@/actions/order/get-feed';
import { type ActionResponse } from '@/lib/server-utils';

import { cn } from '@/lib/utils';
import { EmptyState } from '../shared/empty-state';
import { OrderCard } from './order-card';
import { IsolatedScrollObserver } from './isolated-scroll-observer';
import { IsomorphicOrdersQueryKey, useIsomorphicGate } from '../hooks/useIsomorphicGate';
import { FeedContext } from '../../page';

export type GetOrdersResponseList = GetOrdersResponse<'list'>;
export type InfiniteOrdersData = InfiniteData<GetOrdersResponseList, string | undefined>;

export interface SelectOutput {
    allOrders: GetOrdersResponseList['orders'];
    total: number;
}

export interface OrdersFeedCoreProps {
    queryKey: IsomorphicOrdersQueryKey;
    context: FeedContext;

    serverDataRaw: ActionResponse<GetOrdersResponseList> | null;
}

let connectorRenderCount = 0;
let coreRenderCount = 0;

/**
 * 🧬 CONNECTOR COMPONENT
 */
export const OrdersFeed = React.memo(function OrdersFeed() {
    connectorRenderCount++;
    const isServer = typeof window === 'undefined';
    const envMarker = isServer ? '🧬 [SERVER-SSR]' : '💻 [CLIENT-HYDRATE]';

    const context = useQueryFeedContext() as FeedContext;
    const ordersStream = useOrdersStream<'list'>();

    const { queryKey, isServerKeyMatch, hasCachedData } = useIsomorphicGate();

    console.log(
        `${envMarker} 🔔 [CONNECTOR RENDER #${connectorRenderCount}] OrdersFeed | ` +
        `Match: ${isServerKeyMatch} | Cached: ${hasCachedData} `
    );

    // Стрим разворачивается СТРОГО когда фильтры идентичны серверным дефолтам (F5)
    const serverDataRaw = isServerKeyMatch ? React.use(ordersStream) : null;

    return (
        <OrdersFeedCore
            queryKey={queryKey}
            context={context}

            serverDataRaw={serverDataRaw}
        />
    );
});

/**
 * 🎛️ CORE COMPONENT
 */
const OrdersFeedCore = React.memo(function OrdersFeedCore({
    queryKey,
    context,
    serverDataRaw
}: OrdersFeedCoreProps) {
    coreRenderCount++;
    console.log(`🎬 [CORE ENTRY #${coreRenderCount}] OrdersFeedCore начал выполнение тела функции.`);

    // ⚡️ Стабильный flatMap-процессор списка
    const selectProcessor = useCallback((data: InfiniteOrdersData): SelectOutput => {
        console.log('⚡️ [SELECT MEMO PROCESSOR] Запуск flatMap-процессора на уровне ядра TanStack. cursor:' + data.pages[0].nextCursor);
        return {
            allOrders: data.pages.flatMap((page) => page?.orders ?? []),
            total: data.pages[0]?.total ?? 0
        };
    }, []);

    // 🔥 ДЕКЛАРАТИВНЫЙ ИЗОМОРФНЫЙ СИДЕР
    // Вычисляется симметрично на сервере и клиенте на основе физического наличия serverDataRaw.
    const computedInitialData = useMemo(() => {
        // Мы логируем сам факт опроса затвора. 
        // true — если поток есть (F5), false — если ушли в динамику на клиенте (смена радиуса)
        console.log(`🌱 [INITIAL DATA SEEDER] Опрос затвора для сидинга. HasServerData: ${!!serverDataRaw}`);

        if (!serverDataRaw) {
            console.log(`🛡️ [INITIAL DATA] Сидинг отклонен (мы в динамических фильтрах). Отдаем undefined.`);
            return undefined;
        }

        console.log(`📦 [INITIAL DATA] Подхватываем и разворачиваем готовый Edge-поток.`);
        const unwrapped = unwrap(serverDataRaw, { orders: [], nextCursor: null, total: 0 });
        return { pages: [unwrapped], pageParams: [undefined] };
    }, [serverDataRaw]);

    const query = useInfiniteQuery<
        GetOrdersResponseList,
        Error,
        SelectOutput,
        IsomorphicOrdersQueryKey,
        string | undefined
    >({
        queryKey,
        queryFn: async ({ pageParam }) => {
            console.log(`🚀 [NETWORK FETCH] Танстек ТЯНЕТ данные через queryFn! Radius: ${context.radius}km`);
            return handleAction(
                getOrders({
                    ...context,
                    cursor: pageParam,
                    mode: 'list'
                })
            );
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!context,

        // ⚡️ Танстек v5 идеально подхватит плейсхолдер при смене радиуса, так как computedInitialData 
        // станет статичным undefined (поскольку serverDataRaw превратится в null в коннекторе)
        placeholderData: keepPreviousData,
        initialData: computedInitialData,
        select: selectProcessor,

        notifyOnChangeProps: ['data', 'hasNextPage'],
        staleTime: 1000 * 60,
    });

    console.log(`🏁 [CORE COMMIT #${coreRenderCount}] useInfiniteQuery пройден, JSX уходит на рендеринг. isfetchnig: ${query.isFetching}`);
    const allOrders = query.data?.allOrders ?? [];
    const ordersCount = allOrders.length;

    if (ordersCount === 0 && !query.isFetching) {
        return <EmptyState />;
    }

    return (
        <div className="relative min-h-[600px]">
            <div className={cn(
                "grid gap-10 transition-all duration-700 ease-in-out",
                query.isFetching && !query.isFetchingNextPage ? "opacity-60 blur-[2px]" : "opacity-100 blur-0"
            )}>
                {allOrders.map((order) => (
                    <OrderCard key={order.id} order={order} isMatch={order.isMatch} />
                ))}
            </div>

            <IsolatedScrollObserver
                queryKey={queryKey}
                ordersCount={ordersCount}
                hasNextPage={!!query.hasNextPage}
                fetchNextPage={query.fetchNextPage}
                isError={query.isError}
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
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="group flex items-center gap-6 px-10 py-6 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                    >
                        Вверх
                    </button>
                </div>
            )}
        </div>
    );
});
