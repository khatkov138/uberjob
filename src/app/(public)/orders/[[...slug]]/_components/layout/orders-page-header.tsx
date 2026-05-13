'use client';

import React, { useMemo, useRef, useDeferredValue, Suspense } from 'react';
import { useSuspenseInfiniteQuery, InfiniteData } from '@tanstack/react-query';

import { cn, unwrap } from '@/lib/utils'; // Ваш стандартный хелпер классов
import { GetOrdersResponse } from '@/actions/order/get-feed';
import { useActiveFeed, useOrdersStream, useStaticFeed } from './FeedController';

// --- ТИПЫ И КОНТРАКТЫ ДАННЫХ ---
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

// Скелетон счетчика: рендерится в строку флекса, БЕЗ w-full
const StatsSkeleton = () => (
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

// Скелетон баджа: имеет w-full mt-4, чтобы изначально падать на нижнюю строчку
const BadgeSkeleton = () => (
  <div className="w-full flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px] mt-4">
    <div className="w-24 h-[22px] bg-slate-100 border border-slate-200 rounded-lg animate-pulse" />
  </div>
);


/**
 * 📊 1. АТОМАРНЫЙ ВИЗУАЛЬНЫЙ СЧЕТЧИК
 */
export const HeaderStats = React.memo(({ totalCount, loadedCount, isReady, isFetching }: HeaderStatsProps) => {
  const viewMode = 'list'; // Замените на ваш реальный селектор из стора

  console.log(`📊 [RENDER] HeaderStats | Total: ${totalCount} | Loaded: ${loadedCount} | Ready: ${isReady} | Fetching: ${isFetching}`);

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

HeaderStats.displayName = 'HeaderStats';


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

HeaderStatusBadge.displayName = 'HeaderStatusBadge';


/**
 * 🧱 3. ЕДИНЫЙ ПАССИВНЫЙ ДАТА-БРИДЖ ПОД СУСПЕНСОМ
 */
export const HeaderDataReader = React.memo(() => {
  const context = useActiveFeed();
  const ordersStream = useOrdersStream<'list'>();

  // Изоморфное разворачивание серверного промиса из контекста страницы
  const serverPayload = React.use(ordersStream);

  const queryKey = useMemo(() => ['orders', 'list', context] as const, [context]);
  const lastRenderedContextRef = useRef(context);
  const lastStatsSnapshotRef = useRef<{ totalCount: number; loadedCount: number; isReady: boolean } | null>(null);

  const currentContextHash = useMemo(() => JSON.stringify(context), [context]);
  const prevContextHashRef = useRef(currentContextHash);

  const isFiltersChanged = prevContextHashRef.current !== currentContextHash;

  const { data } = useSuspenseInfiniteQuery<GetOrdersResponseList, Error, InfiniteOrdersData, typeof queryKey>({
    queryKey,
    queryFn: () => { throw new Error("") },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 60,

    initialData: (): InfiniteOrdersData | undefined => {
      if (isFiltersChanged || !serverPayload) return undefined;
      const unwrapped = unwrap(serverPayload, { orders: [], nextCursor: null, total: 0 });
      return {
        pages: [unwrapped],
        pageParams: [undefined]
      };
    }
  });

  const pages = data.pages;
  const firstPageTotal = pages[0]?.total;

  const deferredContext = useDeferredValue(context);
  const UI_isFetching = lastRenderedContextRef.current !== deferredContext;

  if (!UI_isFetching && lastRenderedContextRef.current !== deferredContext) {
    lastRenderedContextRef.current = deferredContext;
  }

  if (pages.length > 0 && prevContextHashRef.current !== currentContextHash) {
    prevContextHashRef.current = currentContextHash;
  }

  const currentStats = useMemo(() => ({
    totalCount: firstPageTotal ?? 0,
    loadedCount: pages.reduce((acc, page) => acc + (page.orders?.length || 0), 0),
    isReady: true
  }), [pages.length, firstPageTotal, UI_isFetching]);

  const stats = useMemo(() => {
    const previous = lastStatsSnapshotRef.current;
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
      {/* ЯРУС 1: Отрендерится четко в строку флекса рядом с h1 города */}
      <HeaderStats
        totalCount={stats.totalCount}
        loadedCount={stats.loadedCount}
        isReady={stats.isReady}
        isFetching={UI_isFetching}
      />

      {/* ЯРУС 2: Отрендерится строго внизу под текстом "Заказы" благодаря w-full и mt-4 */}
      <div className="w-full flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px] mt-4">
        <HeaderStatusBadge
          isFetching={UI_isFetching}
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

  return (
    <div className="flex items-baseline gap-4 flex-wrap min-h-[60px] w-full">
      {/* Название города — влетает в браузер за 0 мс в первом HTTP-чанке */}
      <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none py-1">
        Заказы <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl font-black">в {cityName}</span>
      </h1>

      {/* 
        ⚡️ ПЛОСКИЙ ИЗОМОРФНЫЙ СУСПЕНС:
        Мы убрали промежуточный div-контейнер из fallback!
        Теперь во время загрузки React-фрагмент выплевывает скелетоны ровно в те же 
        флекс-позиции, которые потом займут живые компоненты. 0 Layout Shifts!
      */}
      <Suspense fallback={
        <>
          <StatsSkeleton /> {/* Встанет четко в строку флекса справа от города */}
          <BadgeSkeleton /> {/* Упадет на строчку вниз под заголовок */}
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
  console.log(`⚛️ [RENDER] OrdersPageHeader (Static Frame)`);

  return (
    <div className="px-2 pt-4 pb-8 w-full">
      <HeaderDataBridge />
    </div>
  );
});

OrdersPageHeader.displayName = 'OrdersPageHeader';
