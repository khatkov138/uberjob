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


import { useActiveFeed, useOrdersStream, useServerContextHash } from "../layout/FeedController"
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




type GetOrdersResponseList = GetOrdersResponse<'list'>;
type InfiniteOrdersData = InfiniteData<GetOrdersResponseList, string | undefined>;

// Глобальные счетчики рендеров для отслеживания стабильности рантайма
let connectorRenderCount = 0;



/**
 * 🔌 1. КОННЕКТОР ФИДА (Управление изоморфными затворами и стримингом)
 */
// Глобальный RAM-реестр для отслеживания ПЕРВОГО захода Саспенса по хэшу города/фильтра.
// Вынесен за пределы компонента, чтобы React Concurrent Mode не мог стереть его при сбросе файберов.
/**
 * 🔌 1. КОННЕКТОР ФИДА (Управление изоморфными затворами и стримингом)
 */
export const OrdersFeed = React.memo(function OrdersFeed() {
    connectorRenderCount++;

    // Определяем среду выполнения: Node.js (Сервер) или Браузер (Клиент)
    const isServer = typeof window === 'undefined';
    const envMarker = isServer ? '🧬 [SERVER-SSR]' : '💻 [CLIENT-HYDRATE]';

    const context = useActiveFeed();
    const ordersStream = useOrdersStream<'list'>();
    const queryClient = useQueryClient();

    // 1. Извлекаем намертво зафиксированный серверный хэш контекста
    const serverHash = useServerContextHash();

    const queryKey = React.useMemo(() => ['orders', 'list', context] as const, [context]);
    const hasCachedData = !!queryClient.getQueryData(queryKey);

    const currentContextHash = React.useMemo(() => JSON.stringify(context), [context]);

    // 2. СТРОГИЙ ЗАТВОР СТРИМА: Совпадает ли клиентский контекст с серверным?
    const isServerKeyMatch = currentContextHash === serverHash;

    console.log(
        `${envMarker} [INIT RENDER #${connectorRenderCount}] OrdersFeed | ` +
        `Match: ${isServerKeyMatch} | ` +
        `Cached: ${hasCachedData} | ` +
        `Ключ: ${currentContextHash.substring(0, 20)}...`
    );

    // 3. Вызываем React.use() строго если кэша нет И контекст соответствует серверному (F5 или RSC смена города).
    // Если водитель сменил радиус или скиллы на клиенте (Match: false), serverDataRaw гарантированно равен null.
    // Это исключает ложные зависания Саспенса на старых промисах!
    if (!hasCachedData && isServerKeyMatch) {
        console.log(`${envMarker} 🔍 [SUSPENSE GATE] Кэш пуст, ключи совпали. Безопасно разворачиваем стрим СУБД.`);
    }
    const serverDataRaw = (!hasCachedData && isServerKeyMatch) ? React.use(ordersStream) : null;

    if (serverDataRaw) {
        console.log(`${envMarker} 🔥 [CONCURRENT COMPLETED] Промис успешно пройден! Данные извлечены в один такт.`);
    } else if (hasCachedData) {
        console.log(`${envMarker} 🎛️ [BYPASS] Данные уже были в RAM Танстека. Серверный стрим проигнорирован.`);
    } else {
        console.log(`${envMarker} 🛡️ [CLIENT ONLY MODE] Изменился радиус/фильтр. Серверный стрим заблокирован затвором.`);
    }

    // 4. Флаг изменения фильтров теперь вычисляется элементарно без рефов:
    // Если кэша нет и мы НЕ на холодном старте (ключи не совпали) — значит, фильтры изменились на клиенте
    const isFiltersChanged = !hasCachedData && !isServerKeyMatch;

    return (
        <OrdersFeedCore
            queryKey={queryKey}
            context={context}
            isFiltersChanged={isFiltersChanged}
            serverDataRaw={serverDataRaw}
        />
    );
});


// --- НАШИ СТРОГИЕ КОНТРАКТЫ ТИПОВ ---

type OrderPayloadBackend = GetOrdersResponseList['orders'][number];
interface SelectOutput {
    allOrders: OrderPayloadBackend[];
    total: number;
}
interface OrdersFeedCoreProps {
    queryKey: readonly ['orders', 'list', ReturnType<typeof useActiveFeed>];
    context: ReturnType<typeof useActiveFeed>;
    isFiltersChanged: boolean;
    serverDataRaw: ActionResponse<GetOrdersResponseList> | null;
}

let globalCoreFunctionEntryCount = 0;

const OrdersFeedCore = React.memo(function OrdersFeedCore({
    queryKey,
    context,
    isFiltersChanged,
    serverDataRaw
}: OrdersFeedCoreProps) {
    globalCoreFunctionEntryCount++;

    console.log(`🎬 [FUNCTION ENTRY #${globalCoreFunctionEntryCount}] OrdersFeedCore начал выполнение тела функции.`);
    console.log(`⏱️ [PRE-HOOK CHECK #${globalCoreFunctionEntryCount}] Мы стоим СТРОГО перед вызовом useInfiniteQuery.`);

    const query = useInfiniteQuery<
        GetOrdersResponseList,
        Error,
        SelectOutput,
        typeof queryKey,
        string | undefined
    >({
        queryKey,
        queryFn: async ({ pageParam }) => {
            console.log(`🚀 [CLIENT NETWORK FETCH] Танстек ТЯНЕТ новые данные через queryFn!`);
            return handleAction(
                getOrders({ ...context, cursor: pageParam, mode: 'list' })
            );
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!context,
        placeholderData: keepPreviousData,

        // КРИТИЧЕСКОЕ УПРОЩЕНИЕ РАНТАЙМА:
        // Благодаря затвору на уровне коннектора, нам больше не нужно читать стейты кэша вручную.
        // Если фильтры изменились или серверного стрима нет — мгновенно отдаем undefined.
        initialData: (): InfiniteOrdersData | undefined => {
            console.log(`🌱 [INITIAL DATA SEEDER] Опрос затвора | Вход в функцию компонента: #${globalCoreFunctionEntryCount}`);

            if (isFiltersChanged || !serverDataRaw) {
                return undefined;
            }

            const unwrapped = unwrap(serverDataRaw, { orders: [], nextCursor: null, total: 0 });
            return { pages: [unwrapped], pageParams: [undefined] };
        },

        // Высокопроизводительный flatMap-процессор на уровне ядра TanStack
        select: (data: InfiniteOrdersData): SelectOutput => {
            console.log('⚡️ [SELECT MEMO] Запуск кэширующего flatMap-процессора на уровне ядра TanStack');
            return {
                allOrders: data.pages.flatMap((page) => page?.orders ?? []),
                total: data.pages[0]?.total ?? 0
            };
        },

        notifyOnChangeProps: ['data', 'hasNextPage'],
        staleTime: 1000 * 60,
    });

    console.log(`🏁 [FUNCTION END #${globalCoreFunctionEntryCount}] useInfiniteQuery успешно пройден, отдаем JSX на коммит.`);

    const allOrders = query.data?.allOrders ?? [];
    const total = query.data?.total ?? 0;
    const ordersCount = allOrders.length;

    if (ordersCount === 0 && !query.isFetching) {
        return <EmptyState />;
    }

    return (
        <div className="relative min-h-[600px]">
            {/* СПИСОК С КЛАССАМИ ОПТИМИЗАЦИИ АНИМАЦИЙ */}
            <div className={cn(
                "grid gap-10 transition-all duration-700 ease-in-out",
                query.isFetching && !query.isFetchingNextPage ? "opacity-60 blur-[2px]" : "opacity-100 blur-0"
            )}>
                {allOrders.map((order) => (
                    <OrderCard key={order.id} order={order} isMatch={order.isMatch} />
                ))}
            </div>

            {/* 🔥 ИЗОЛИРОВАННЫЙ НАБЛЮДАТЕЛЬ СКРОЛЛА (0 ререндеров фида при пересечении экрана) */}
            <IsolatedScrollObserver
                queryKey={queryKey}
                ordersCount={ordersCount}
                hasNextPage={!!query.hasNextPage}
                fetchNextPage={query.fetchNextPage}
                isError={query.isError}
            />

            {/* ФИНАЛЬНЫЙ БЛОК (The End) */}
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