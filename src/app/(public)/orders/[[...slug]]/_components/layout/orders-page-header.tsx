// src/features/orders/ui/orders-page-header.tsx
'use client';

import React, { useMemo, use, useRef, Suspense } from "react";
import { useQuery, type InfiniteData } from "@tanstack/react-query";
import { cn, unwrap } from "@/lib/utils";
import { useStaticFeed, useActiveFeed, useOrdersStream } from "./FeedController";
import { useFeedStore } from "./FeedProvider";
import { type GetOrdersResponse } from "@/actions/order/get-feed";
import { type ActionResponse } from "@/lib/server-utils";

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

interface HeaderStatsProps {
  totalCount: number;
  loadedCount: number;
  isReady: boolean;
  isFetching: boolean;
}

/**
 * 📊 1. АТОМАРНЫЙ СЧЕТЧИК
 * Защищен через React.memo. Изменение родительских узлов не заставит React 
 * перерисовывать реальные DOM-ноды с текстом, если цифры примитивов совпали.
 */
const HeaderStats = React.memo(({ totalCount, loadedCount, isReady, isFetching }: HeaderStatsProps) => {
  const viewMode = useFeedStore((s) => s.viewMode);

  console.log(`📊 [RENDER] HeaderStats | Total: ${totalCount} | Loaded: ${loadedCount} | Ready: ${isReady} | Fetching: ${isFetching}`);

  if (!isReady) return <StatsSkeleton />;

  return (
    <div className="flex items-center h-[60px] min-w-[140px]">
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
    </div>
  );
});

interface HeaderStatusBadgeProps {
  isFetching: boolean;
  isReady: boolean;
}

/**
 * 📡 2. ИНДИКАТОР СТАТУСА (БАДЖ)
 */
const HeaderStatusBadge = React.memo(({ isFetching, isReady }: HeaderStatusBadgeProps) => {
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

/**
 * 🧱 3. ЕДИНЫЙ ПАССИВНЫЙ ДАТА-БРИДЖ ПОД СУСПЕНСОМ
 * Реализует паттерн Progressive Cache Takeover.
 * Бесшовно объединяет асинхронныйuse(ordersStream) и RAM-кэш Танстека v5.
 */function HeaderDataBridge() {
  const context = useActiveFeed();
  const { name: cityName } = useStaticFeed();

  const ordersStream = useOrdersStream<'list'>();
  const serverDataRaw = use(ordersStream);

  const queryKey = useMemo(() => ['orders', 'list', context] as const, [context]);
  const lastRenderedContextRef = useRef(context);

  // Ссылочный затвор для сохранения идентичности объекта статов между микротасками
  const lastStatsSnapshotRef = useRef<{ totalCount: number; loadedCount: number; isReady: boolean } | null>(null);

  const { data } = useQuery<
    GetOrdersResponse<'list'>,
    Error,
    InfiniteData<GetOrdersResponse<'list'>>,
    typeof queryKey
  >({
    queryKey,
    enabled: false,
    queryFn: () => new Promise(() => { }),
    notifyOnChangeProps: ['data']
  });

  const cachedPages = data?.pages;
  const hasFreshData = cachedPages && cachedPages.length > 0;

  if (hasFreshData && lastRenderedContextRef.current !== context) {
    lastRenderedContextRef.current = context;
  }

  const isFiltersChanged = !hasFreshData && lastRenderedContextRef.current !== context;
  const UI_isFetching = isFiltersChanged;

  console.log(`🧱 [RENDER] HeaderDataBridge (Single Observer) | City: ${cityName} | HasData: ${hasFreshData} | UIFetching: ${UI_isFetching}`);

  const pagesLength = cachedPages?.length ?? 0;

  // Изоморфный расчет статов с сохранением ссылочной целостности объекта
  const stats = useMemo(() => {
    let current: { totalCount: number; loadedCount: number; isReady: boolean };

    if (hasFreshData && cachedPages) {
      // 1. Приоритет №1: Кэш Танстека в оперативной памяти
      current = {
        totalCount: cachedPages[0]?.total ?? 0,
        loadedCount: cachedPages.reduce((acc, page) => acc + (page.orders?.length || 0), 0),
        isReady: true
      };
    } else if (isFiltersChanged) {
      // 2. Приоритет №2: Транзакция навигации / смены фильтров
      current = { totalCount: 0, loadedCount: 0, isReady: false };
    } else {
      // 3. Приоритет №3: Холодный старт (F5) и первый кадр — распаковка SSR промиса Next.js 15
      const unwrapped = unwrap(serverDataRaw, { orders: [], nextCursor: null, total: 0 });
      current = {
        totalCount: unwrapped.total,
        loadedCount: unwrapped.orders?.length || 0,
        isReady: true
      };
    }

    // ⚡️ ССЫЛОЧНЫЙ ЗАЩЕЛКИВАЮЩИЙ ЗАТВОР:
    // Если примитивы структуры в точности совпадают с прошлым кадром — отдаем СТАРУЮ ссылку на объект из кучи!
    if (
      lastStatsSnapshotRef.current &&
      lastStatsSnapshotRef.current.totalCount === current.totalCount &&
      lastStatsSnapshotRef.current.loadedCount === current.loadedCount &&
      lastStatsSnapshotRef.current.isReady === current.isReady
    ) {
      return lastStatsSnapshotRef.current;
    }

    // Если данные реально изменились (прилетела новая пагинация или сокет) — обновляем ссылку
    lastStatsSnapshotRef.current = current;
    return current;
  }, [pagesLength, hasFreshData, isFiltersChanged, serverDataRaw]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-4 flex-wrap min-h-[60px]">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none py-1">
          Заказы <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl font-black">в {cityName}</span>
        </h1>

        <HeaderStats
          totalCount={stats.totalCount}
          loadedCount={stats.loadedCount}
          isReady={stats.isReady}
          isFetching={UI_isFetching}
        />
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px]">
        <HeaderStatusBadge
          isFetching={UI_isFetching}
          isReady={stats.isReady}
        />
      </div>
    </div>
  );
}

/**
 * 🏛 4. ГЛАВНЫЙ СТАТИЧЕСКИЙ КАРКАС ХЕДЕРА
 */
export const OrdersPageHeader = React.memo(function OrdersPageHeader() {
  console.log(`⚛️ [RENDER] OrdersPageHeader (Static Frame)`);

  return (
    <div className="px-2 pt-4 pb-8">
      <Suspense fallback={
        <div className="space-y-4 animate-pulse">
          <div className="flex items-baseline gap-4 flex-wrap min-h-[60px]">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-200 leading-none py-1">
              Заказы...
            </h1>
            <StatsSkeleton />
          </div>
          <div className="h-[22px] w-24 bg-slate-100 rounded-lg" />
        </div>
      }>
        <HeaderDataBridge />
      </Suspense>
    </div>
  );
});
