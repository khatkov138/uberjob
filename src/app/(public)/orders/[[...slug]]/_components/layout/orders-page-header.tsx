'use client';

import React, { useMemo, useRef, Suspense, use, useCallback } from 'react';
import { useQueryClient, useIsFetching, InfiniteData, useQuery, keepPreviousData } from '@tanstack/react-query';

import { cn, unwrap } from '@/lib/utils';
import { GetOrdersResponse } from '@/actions/order/get-feed';

import { useIsomorphicGate } from '../hooks/useIsomorphicGate';
import { useInitialData, useOrdersStream } from '../providers/FeedController';


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
        <div className="w-16 h-12 bg-slate-100 rounded-2xl" />
        <div className="flex flex-col gap-1 translate-y-[-4px]">
          <div className="w-12 h-2 bg-slate-100 rounded" />
          <div className="w-10 h-4 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
};

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
HeaderStats.displayName = 'HeaderStats';

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
HeaderStatusBadge.displayName = 'HeaderStatusBadge';

/***/

export const HeaderDataReader = React.memo(function HeaderDataReader() {
  // 1. Извлекаем изоморфный затвор, сырой промис и статику URL страниц
  const { isServerKeyMatch, queryKey } = useIsomorphicGate();
  const { citySlug, categorySlug } = useInitialData();
  const ordersStream = useOrdersStream<'list'>(); // 🎯 Сужаем тип дженериком на входе за 0ms
  const globalIsFetching = useIsFetching({ queryKey }) > 0;

  // 2. 🎯 БЕЗУСЛОВНЫЙ use() НА КОРНЕ КОМПОНЕНТА ДЛЯ REACT 19: Точечный саспенс хедера
  const resolvedStream = use(ordersStream);
  const serverDataRaw = isServerKeyMatch ? unwrap(resolvedStream, null) : null;

  // 3. Пассивный декларативный наблюдатель за RAM-кэшем Танстека с удержанием старого кадра
  const { data } = useQuery<InfiniteOrdersData>({
    queryKey,
    queryFn: () => { throw new Error("Observer only") },
    enabled: false,
    placeholderData: keepPreviousData, // Канонический удержатель кадра v5
  });

  // Хранилище слепка для UX Keep-Alive (инициализируем дефолтами)
  const lastStatsSnapshotRef = useRef<{ totalCount: number; loadedCount: number; isReady: boolean }>({
    totalCount: 0,
    loadedCount: 0,
    isReady: false
  });

  // 🔒 ЖЕСТКИЙ СБРОС КЭША ПРИ СМЕНЕ СТАТИКИ (Город / Категория)
  // Гарантирует включение скелетонов при роутинге, но оставляет удержание цифр при смене радиуса
  const currentUrlMarker = `${citySlug}::${categorySlug ?? 'all'}`;
  const lastUrlMarkerRef = useRef(currentUrlMarker);

  if (lastUrlMarkerRef.current !== currentUrlMarker) {
    lastUrlMarkerRef.current = currentUrlMarker;
    lastStatsSnapshotRef.current = { totalCount: 0, loadedCount: 0, isReady: false }; // Сброс под скелетоны
  }

  // 4. Чистый синхронный сбор текущих метрик без побочных эффектов (БЕЗ ANY / БЕЗ AS)
  const currentStats = useMemo(() => {
    // Сценарий А: Данные удерживаются в Танстеке при смене фильтров
    if (data?.pages && data.pages.length > 0) {
      const firstPage = data.pages[0];
      const totalCount = firstPage?.total ?? 0; // 🎯 ЧИСТЫЙ ТИП: total берется из строго типизированной структуры
      const loadedCount = data.pages.reduce((acc, page) => acc + (page?.orders?.length || 0), 0);

      return { totalCount, loadedCount, isReady: true };
    }

    // Сценарий Б: Холодный старт (F5) — данные гарантированно развернуты через use() выше
    if (serverDataRaw) {
      return {
        totalCount: serverDataRaw.total ?? 0,
        loadedCount: serverDataRaw.orders?.length || 0,
        isReady: true
      };
    }

    // Сценарий В: Смена фильтров на самом старте, когда вообще нет истории
    return null;
  }, [data, serverDataRaw]);

  // 5. Высокопроизводительный стабилизатор ссылок БЕЗ мутаций внутри useMemo
  const stats = useMemo(() => {
    const previous = lastStatsSnapshotRef.current;

    // Если текущие метрики пустые (Сценарий В) — отдаем сброшенный реф (где isReady: false -> StatsSkeleton)
    if (currentStats === null) {
      return previous;
    }

    const isIdentical = previous &&
      previous.totalCount === currentStats.totalCount &&
      previous.loadedCount === currentStats.loadedCount &&
      previous.isReady === currentStats.isReady;

    return isIdentical ? previous : currentStats;
  }, [currentStats]);

  // 🔒 СИНХРОННЫЙ КОММИТ СЛЕПКА: Обновляем реф строго после того, как React высчитал стейт рендеринга
  if (currentStats !== null && currentStats !== lastStatsSnapshotRef.current) {
    lastStatsSnapshotRef.current = currentStats;
  }

  // 🔍 ЖЕСТКИЙ ПЕРЕХВАТ ТАЙМИНГОВ ГИДРАТАЦИИ
  if (typeof window !== 'undefined') {
    console.log(
      `🚨 [HYDRATION_CHECK] | ` +
      `isServerKeyMatch: ${isServerKeyMatch} | ` +
      `serverDataRaw_Is_Null: ${serverDataRaw === null} | ` +
      `RAM_Cache_Has_Pages: ${!!data?.pages?.length}`
    );
  }

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
  // 🎯 Читаем имя города напрямую из общего монолитного контекста
  const { cityName } = useInitialData();

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
