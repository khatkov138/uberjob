'use client';

import React, { useMemo, useRef, Suspense, use } from 'react';
import { useQueryClient, useIsFetching, InfiniteData, useQuery } from '@tanstack/react-query';

import { cn, unwrap } from '@/lib/utils';
import { GetOrdersResponse } from '@/actions/order/get-feed';
import { useActiveFeed, useOrdersStream, useQueryFeedContext, useStaticFeed } from '../providers/FeedController';
import { useIsomorphicGate } from '../hooks/useIsomorphicGate';



// --- СТРОГИЕ КОНТРАКТЫ ДАННЫХ И ТИПИЗАЦИЯ ---
type GetOrdersResponseList = GetOrdersResponse<'list'>;
type InfiniteOrdersData = InfiniteData<GetOrdersResponseList>;

interface HeaderStatsProps {
  totalCount: number;
  loadedCount: number;
  isReady: boolean;
  isFetching: boolean;
}

interface HeaderStatusBadgeProps {
  isFetching: boolean;
  isReady: boolean;
}

// --- АТОМАРНЫЕ ИЗОЛИРОВАННЫЕ СКЕЛЕТОНЫ ---

const StatsSkeleton = () => {
  console.log('Bone [RENDER] StatsSkeleton');
  return (
    <div className="flex items-center gap-3 animate-pulse h-[60px]">
      <span className="text-5xl font-black italic text-slate-50">/</span>
      <div className="flex items-baseline gap-2">
        {/* Фиксируем ширину под 2-3 значные цифры (w-16) и высоту под text-6xl (h-12) */}
        <div className="w-16 h-12 bg-slate-100 rounded-2xl" />
        <div className="flex flex-col gap-1 translate-y-[-4px]">
          <div className="w-12 h-2 bg-slate-100 rounded" />
          <div className="w-10 h-4 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
};

/**
 * 🦴 ГЕОМЕТРИЧЕСКИЙ БЛИЗНЕЦ БАДЖА (0px LAYOUT SHIFT)
 * Реплицирует h-[22px], mt-4, w-24 и внутренние скругления rounded-lg.
 */
const BadgeSkeleton = () => {
  console.log('Bone [RENDER] BadgeSkeleton');
  return (
    <div className="w-full flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px] mt-4">
      <div className="w-24 h-[22px] bg-slate-100 border border-slate-200 rounded-lg animate-pulse" />
    </div>
  );
};

/**
 * 📊 1. АТОМАРНЫЙ ВИЗУАЛЬНЫЙ СЧЕТЧИК
 */
export const HeaderStats = React.memo(({ totalCount, loadedCount, isReady, isFetching }: HeaderStatsProps) => {
  console.log(`📊 [RENDER] HeaderStats | Total: ${totalCount} | Loaded: ${loadedCount} | Ready: ${isReady} | Fetching: ${isFetching}`);

  const viewMode = 'list';

  return (
    // Жесткий ограничивающий контейнер h-[60px] гарантирует иммунитет к вертикальным сдвигам
    <div className="flex items-center h-[60px] min-w-[140px]">
      {!isReady ? (
        <StatsSkeleton />
      ) : (
        <div className={cn(
          "flex items-center gap-3 animate-in fade-in zoom-in-95 duration-500 transition-opacity h-[60px]",
          isFetching ? "opacity-40" : "opacity-100"
        )}>
          <span className="text-5xl font-black italic text-slate-100">/</span>
          <div className="flex items-baseline">
            <span className="text-6xl font-black italic text-slate-900 tracking-tighter tabular-nums leading-none">
              {totalCount}
            </span>

            {totalCount > 0 && viewMode === 'list' && (
              <div className="flex flex-col ml-2 translate-y-[-4px]">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-0.5 whitespace-nowrap">
                  Найдено
                </span>
                <span className="text-2xl font-black italic text-slate-300 leading-none tracking-tighter tabular-nums">
                  / {loadedCount}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * 📡 2. ИНДИКАТОР АКТУАЛЬНОСТИ (БАДЖ)
 */
export const HeaderStatusBadge = React.memo(({ isFetching, isReady }: HeaderStatusBadgeProps) => {
  console.log(`📡 [RENDER] HeaderStatusBadge | Fetching: ${isFetching} | Ready: ${isReady}`);

  if (!isReady) {
    return <BadgeSkeleton />;
  }

  return (
    <div className="w-full flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px] mt-4">
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-500 h-[22px] w-24 justify-center",
        isFetching ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm"
      )}>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          isFetching ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
        )} />
        <span className="tracking-[0.1em] text-[9px] uppercase font-bold whitespace-nowrap">
          {isFetching ? "Обновление" : "Actual"}
        </span>
      </div>
    </div>
  );
});

/**
 * 🧱 3. ДЕКЛАРАТИВНЫЙ ИЗОМОРФНЫЙ РИДЕР КЭША И СТРИМА
 */export const HeaderDataReader = React.memo(function HeaderDataReader() {
  // 1. Подключаемся к шине данных через контексты платформы ZWORK
  const context = useQueryFeedContext();
  const ordersStream = useOrdersStream<'list'>();

  // 2. Формируем детерминированный queryKey, строго совпадающий с OrdersFeed
  const queryKey = useMemo(() => ['orders', 'list', context] as const, [context]);

  // Статусы фетчинга из RAM-кэша TanStack Query v5
  const globalIsFetching = useIsFetching({ queryKey }) > 0;

  // 3. Внедряем единый изоморфный затвор из кастомного хука
  const { isServerKeyMatch, hasCachedData } = useIsomorphicGate(queryKey);

  // 4. 🔒 БЕЗОПАСНЫЙ ЗАТВОР RECOGNITION (React 19 Rules):
  // Разворачиваем стрим строго на холодном старте (F5) на верхнем уровне компонента
  const shouldUnwrapStream = !hasCachedData && isServerKeyMatch;
  const serverDataRaw = shouldUnwrapStream ? use(ordersStream) : null;

  console.log('orderspageheader', isServerKeyMatch, hasCachedData);


  // 5. Пассивный декларативный наблюдатель за RAM-кэшем Танстека с удержанием старого кэша
  const { data } = useQuery<InfiniteOrdersData>({
    queryKey,
    queryFn: () => { throw new Error("Observer only") },
    enabled: false,
    // placeholderData: keepPreviousData, // 🔥 ГАРАНТИЯ ОТ СКЕЛЕТОНОВ: удерживает data при смене queryKey!
  });

  // Хранилище слепка для UX Keep-Alive
  const lastStatsSnapshotRef = useRef<{ totalCount: number; loadedCount: number; isReady: boolean } | null>(null);

  // 6. Синхронный процессор сбора метрик (работает без вызовов hooks/unwrap внутри)
  const currentStats = useMemo(() => {
    // Сценарий А: Данные уже есть в RAM-кэше Танстека (или удерживаются через placeholderData)
    if (data?.pages && data.pages.length > 0) {
      const { pages } = data;
      const firstPageTotal = pages[0]?.total ?? 0;
      const loadedCount = pages.reduce((acc, page) => acc + (page?.orders?.length || 0), 0);

      // Шапка готова, только если в фоне не идет фетчинг новой порции данных
      return { totalCount: firstPageTotal, loadedCount, isReady: !globalIsFetching };
    }

    // Сценарий Б: Холодный старт (F5) — данные гарантированно развернуты выше через React.use
    if (serverDataRaw) {
      const unwrapped = unwrap(serverDataRaw, { orders: [], nextCursor: null, total: 0 });
      return {
        totalCount: unwrapped?.total ?? 0,
        loadedCount: unwrapped?.orders?.length || 0,
        isReady: true
      };
    }

    // Сценарий В: Смена фильтров на самом старте, когда вообще нет истории
    return null;
  }, [data, serverDataRaw, globalIsFetching]);

  // 7. Высокопроизводительный стабилизатор ссылок (Keep-Alive UX Шапки)
  const stats = useMemo(() => {
    const previous = lastStatsSnapshotRef.current;

    if (currentStats === null) {
      return previous ?? { totalCount: 0, loadedCount: 0, isReady: false };
    }

    if (
      previous &&
      previous.totalCount === currentStats.totalCount &&
      previous.loadedCount === currentStats.loadedCount &&
      previous.isReady === currentStats.isReady
    ) {
      return previous;
    }

    lastStatsSnapshotRef.current = currentStats;
    return currentStats;
  }, [currentStats]);

  return (
    <>
      <HeaderStats
        totalCount={stats.totalCount}
        loadedCount={stats.loadedCount}
        isReady={stats.isReady}
        isFetching={globalIsFetching}
      />
      <HeaderStatusBadge
        isFetching={globalIsFetching}
        isReady={stats.isReady}
      />
    </>
  );
});
/**
 * 🧱 4. ШЛЮЗ ДАННЫХ ХЕДЕРА
 */
export function HeaderDataBridge() {
  const { name: cityName } = useStaticFeed();
  console.log(`🔌 [RENDER] HeaderDataBridge | City: ${cityName}`);

  return (
    <div className="flex items-baseline gap-4 flex-wrap min-h-[60px] w-full">
      <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none py-1">
        Заказы <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl font-black">в {cityName}</span>
      </h1>

      <Suspense fallback={
        <>
          <StatsSkeleton />
          <BadgeSkeleton />
        </>
      }>
        <HeaderDataReader />
      </Suspense>
    </div>
  );
}

/**
 * 🏛 5. ГЛАВНЫЙ СТАТИЧЕСКИЙ КАРКАС ХЕДЕРА
 */
export const OrdersPageHeader = React.memo(function OrdersPageHeader() {
  console.log(`⚛️ [RENDER] OrdersPageHeader (Static Core Wrapper)`);

  return (
    <div className="px-2 pt-4 pb-8 w-full">
      <HeaderDataBridge />
    </div>
  );
});
OrdersPageHeader.displayName = 'OrdersPageHeader';
