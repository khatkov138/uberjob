'use client';

import React, { useMemo, useRef, Suspense, use } from 'react';
import { useQueryClient, useIsFetching, InfiniteData, useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { GetOrdersResponse } from '@/actions/order/get-feed';
import { useActiveFeed, useStaticFeed } from './FeedController';

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
  console.log('🦴 [RENDER] StatsSkeleton');
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <span className="text-5xl font-black italic text-slate-50">/</span>
      <div className="flex items-baseline gap-2">
        <div className="w-14 h-12 bg-slate-100 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <div className="w-10 h-2 bg-slate-100 rounded" />
          <div className="w-12 h-4 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
};

const BadgeSkeleton = () => {
  console.log('🦴 [RENDER] BadgeSkeleton');
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
    <div className="flex items-center h-[60px] min-w-[140px]">
      {!isReady ? (
        <StatsSkeleton />
      ) : (
        <div className={cn(
          "flex items-center gap-3 animate-in fade-in zoom-in-95 duration-500 transition-opacity",
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

  const UI_isFetching = isFetching || !isReady;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-500 h-[22px] w-24 justify-center",
      UI_isFetching ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm"
    )}>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full shrink-0",
        UI_isFetching ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
      )} />
      <span className="tracking-[0.1em] text-[9px] uppercase font-bold whitespace-nowrap">
        {UI_isFetching ? "Обновление" : "Актуально"}
      </span>
    </div>
  );
});

// Глобальный счетчик рендеров Хедера для отладки рантайма
let headerDataReaderRenderCount = 0;

export const HeaderDataReader = React.memo(() => {
  headerDataReaderRenderCount++;

  const context = useActiveFeed();
  const queryKey = useMemo(() => ['orders', 'list', context] as const, [context]);

  // Проверяем глобальный статус фетчинга для этого ключа
  const globalIsFetching = useIsFetching({ queryKey }) > 0;


  // ПАССИВНЫЙ ДЕКЛАРАТИВНЫЙ РИДЕР КЭША
  // enabled: false гарантирует, что Хедер НИКОГДА сам не пойдет в сеть и не вызовет queryFn [1]
  const { data, status } = useQuery<InfiniteOrdersData>({
    queryFn: () => { throw new Error("Observer only") },
    queryKey,
    enabled: false, // Жесткий затвор от холостых сетевых запросов [1]
  });

  console.log(`🧱 [RENDER #${headerDataReaderRenderCount}] HeaderDataReader | Fetching: ${globalIsFetching} |status:${status}|  LocationId: ${context.locationId} | Radius: ${context.radius}}`);

  const lastStatsSnapshotRef = useRef<{ totalCount: number; loadedCount: number; isReady: boolean } | null>(null);

  // Синхронный сбор метрик из RAM-слепка Танстека
  const currentStats = useMemo(() => {
    // Если Танстек еще пуст под этот ключ (смена фильтра/города)
    if (status === 'pending' || !data || !data.pages || data.pages.length === 0) {
      console.log(`⏳ [STATUS PENDING] Данных в RAM нет. Нативно включаю Скелетоны.`);
      return { totalCount: 0, loadedCount: 0, isReady: false };
    }

    const pages = data.pages;
    const firstPageTotal = pages[0]?.total ?? 0;
    const loadedCount = pages.reduce((acc, page) => acc + (page?.orders?.length || 0), 0);

    return {
      totalCount: firstPageTotal,
      loadedCount,
      isReady: true
    };
  }, [data, status]);

  // Наш высокопроизводительный стабилизатор ссылок (UX-оптимизатор)
  const stats = useMemo(() => {
    const previous = lastStatsSnapshotRef.current;
    console.log(`lastStatsSnapshotRef: ` + previous)
    if (
      previous &&
      previous.totalCount === currentStats.totalCount &&
      previous.loadedCount === currentStats.loadedCount &&
      previous.isReady === currentStats.isReady
    ) {
      return previous;
    }

    console.log('🔄 [SNAPSHOT MUTATION] Метрики изменились, фиксирую стейт хедера.');
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

      <div className="w-full flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px] mt-4">
        <HeaderStatusBadge
          isFetching={globalIsFetching}
          isReady={stats.isReady}
        />
      </div>
    </>
  );
});
HeaderDataReader.displayName = 'HeaderDataReader';



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
