'use client'

import React, { useMemo, use, useRef, Suspense } from "react";
import { useQuery, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { cn, unwrap } from "@/lib/utils";
import { useStaticFeed, useActiveFeed, useOrdersStream } from "./FeedController";
import { useFeedStore } from "./FeedProvider";
import { GetOrdersResponse } from "@/actions/order/get-feed";

// Типизируем структуру данных, которую вернет наш селектор кэша
interface MemoizedStats {
  totalCount: number;
  loadedCount: number;
  isReady: boolean; // Затвор для скелетона
}

/**
 * 1. СКЕЛЕТОН СТАТИСТИКИ
 */
const StatsSkeleton = () => {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <span className="text-5xl font-black italic text-slate-50">/</span>
      <div className="flex items-baseline gap-2">
        <div className="w-14 h-12 bg-slate-50 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <div className="w-10 h-2 bg-slate-50 rounded" />
          <div className="w-12 h-4 bg-slate-50 rounded" />
        </div>
      </div>
    </div>
  );
};

/**
 * Вспомогательный хук для сквозного пассивного чтения данных.
 * Вызывается строго внутри компонентов, обернутых в Suspense, 
 * чтобы не блокировать рендеринг названия города на сервере.
 */
function usePassiveStats() {
  const context = useActiveFeed();
  const queryClient = useQueryClient();
  const ordersStream = useOrdersStream();

  // React 19 use() сработает внутри Suspense саб-компонентов.
  // Каркас хедера и CityName пролетят выше этой точки без задержек.
  const serverDataRaw = use(ordersStream);
  const queryKey = ['orders', 'list', context];

  // ЗАТВОР ДЛЯ ФИЛЬТРОВ: Ловим момент, когда юзер крутит радиус или меняет категорию
  const initialContextRef = useRef(context);
  const isFiltersChanged = initialContextRef.current !== context;

  return useQuery<InfiniteData<GetOrdersResponse<'list'>>, Error, MemoizedStats>({
    queryKey,
    enabled: false,
    queryFn: () => { throw new Error('Header should not fetch data on its own') },

    initialData: (): InfiniteData<GetOrdersResponse<'list'>> | undefined => {
      const cached = queryClient.getQueryData<InfiniteData<GetOrdersResponse<'list'>>>(queryKey);
      if (cached) return cached;

      if (isFiltersChanged) return undefined;

      const initialOrders = unwrap(serverDataRaw, { orders: [], nextCursor: null, total: 0 }) as GetOrdersResponse<'list'>;
      return {
        pages: [initialOrders],
        pageParams: [undefined]
      };
    },

    // ОПТИМИЗИРОВАННЫЙ СЕЛЕКТОР ЯДРА ТАНСТЕКА
    select: (cacheData): MemoizedStats => {
      const pages = cacheData.pages || [];

      if (pages.length === 0 || !pages) {
        return { totalCount: 0, loadedCount: 0, isReady: false };
      }

      const firstPage = pages;
      const totalCount = firstPage[0]?.total ?? 0;
      const loadedCount = pages.reduce((acc, page) => acc + (page.orders?.length || 0), 0);

      return { totalCount, loadedCount, isReady: true };
    },
  });
}

/**
 * 2. АТОМАРНЫЙ СЧЕТЧИК
 */
const HeaderStats = React.memo(() => {
  const { data: stats, isFetching } = usePassiveStats();
  const viewMode = useFeedStore(s => s.viewMode);

  const totalCount = stats?.totalCount ?? 0;
  const loadedCount = stats?.loadedCount ?? 0;
  const isReady = stats?.isReady ?? false;

  console.log(`📊 [RENDER] HeaderStats | Total: ${totalCount} | Fetching: ${isFetching} | Ready: ${isReady}`);

  const showSkeleton = !isReady;

  return (
    <div className="flex items-center h-[60px] min-w-[140px]">
      {showSkeleton ? (
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
 * 3. ИНДИКАТОР СТАТУСА
 */
const HeaderStatusBadge = React.memo(() => {
  const { data: stats, isFetching } = usePassiveStats();
  const isReady = stats?.isReady ?? false;

  console.log(`📡 [RENDER] HeaderStatusBadge | Fetching: ${isFetching} | Ready: ${isReady}`);

  // ФИКС МОРГАНИЯ И ПРЫЖКОВ: 
  // Если кэш НЕ готов (!isReady) — мы МГНОВЕННО форсируем синее состояние "Обновление...".
  // Мы не возвращаем серый StatsSkeleton плашки, бадж сохраняет свои размеры w-24 и h-[22px]!
  const UI_isFetching = isFetching || !isReady;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-500 h-[22px] w-24 justify-center",
      UI_isFetching
        ? "bg-blue-50 border-blue-100 text-blue-600"
        : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm"
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
 * СТАБИЛЬНЫЙ ГОРОД (Читает исключительно синхронную статику географии)
 */
const CityName = React.memo(() => {
  const { name } = useStaticFeed();
  console.log(`📍 [RENDER] CityName: ${name}`);

  return (
    <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl font-black">
      в {name}
    </span>
  );
});

/**
 * 4. ОСНОВНОЙ ХЕДЕР (Разрезанный каркас, готовый к моментальному SSR)
 */
export const OrdersPageHeader = React.memo(function OrdersPageHeader() {
  console.log(`⚛️ [RENDER] OrdersPageHeader (Static Frame)`);

  return (
    <div className="px-2 pt-4 pb-8 space-y-4">
      <div className="flex items-baseline gap-4 flex-wrap min-h-[60px]">
        {/* 
          Этот заголовок НЕ содержит асинхронных хуков use() и useQuery, 
          поэтому Next.js 15 отрендерит его на сервере моментально.
          При F5 пользователь СРАЗУ видит "Заказы в г. Ангарск" без белого экрана!
        */}
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none py-1">
          Заказы <CityName />
        </h1>

        {/* Изолируем счетчик в персональный затвор Suspense */}
        <Suspense fallback={<StatsSkeleton />}>
          <HeaderStats />
        </Suspense>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px]">
        {/* Изолируем бадж статуса в персональный затвор Suspense */}
        <Suspense fallback={<div className="h-[22px] w-24 bg-slate-50 animate-pulse rounded-lg" />}>
          <HeaderStatusBadge />
        </Suspense>
      </div>
    </div>
  );
});
