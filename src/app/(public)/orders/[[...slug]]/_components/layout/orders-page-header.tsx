'use client';

import React, { useMemo, useRef, Suspense, use } from 'react';
import { useQueryClient, useIsFetching, InfiniteData, useQuery } from '@tanstack/react-query';

import { cn, unwrap } from '@/lib/utils';
import { GetOrdersResponse } from '@/actions/order/get-feed';
import { useActiveFeed, useStaticFeed, useServerContextHash, useOrdersStream } from './FeedController';

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
    // Анатомическая обертка удержана внутри скелетона для фиксации геометрии под заголовком
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
HeaderStats.displayName = 'HeaderStats';

/**
 * 📡 2. ИНДИКАТОР АКТУАЛЬНОСТИ (БАДЖ)
 */
export const HeaderStatusBadge = React.memo(({ isFetching, isReady }: HeaderStatusBadgeProps) => {
  console.log(`📡 [RENDER] HeaderStatusBadge | Fetching: ${isFetching} | Ready: ${isReady}`);

  // Если данные не готовы (холодный старт без кэша), нативно подставляем скелетон в ту же позицию
  if (!isReady) {
    return <BadgeSkeleton />;
  }

  const UI_isFetching = isFetching;

  return (
    // Живая верстка сохраняет ту же структуру флекс-контейнера и отступы, что и скелетон
    <div className="w-full flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px] mt-4">
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
    </div>
  );
});
HeaderStatusBadge.displayName = 'HeaderStatusBadge';

// Глобальный счетчик рендеров Хедера для отладки рантайма
let headerDataReaderRenderCount = 0;

/**
 * 🧱 3. ДЕКЛАРАТИВНЫЙ ИЗОМОРФНЫЙ РИДЕР КЭША И СТРИМА
 */
export const HeaderDataReader = React.memo(() => {
  headerDataReaderRenderCount++;

  const context = useActiveFeed();
  const queryClient = useQueryClient();

  // Извлекаем намертво зафиксированный серверный хэш контекста холодного старта (F5)
  const serverHash = useServerContextHash();

  const queryKey = useMemo(() => ['orders', 'list', context] as const, [context]);

  // Проверяем глобальный статус фетчинга для этого ключа под индикацию баджа
  const globalIsFetching = useIsFetching({ queryKey }) > 0;

  // Изоморфно опрашиваем RAM-кэш Танстека под активный ключ
  const hasCachedData = !!queryClient.getQueryData(queryKey);

  // Получаем ссылку на изоморфный стрим
  const ordersStream = useOrdersStream<'list'>();

  // ЗЕРКАЛЬНЫЙ АТОМАРНЫЙ ЗАТВОР СТРИМА НА ОСНОВЕ СФЕРИЧЕСКОГО ХЭША КОНТЕКСТА
  const currentHash = JSON.stringify(context);
  const isServerKeyMatch = currentHash === serverHash;

  // Разворачиваем стрим СУБД строго на холодном старте (когда кэша нет и контекст совпал)
  const serverDataRaw = (!hasCachedData && isServerKeyMatch) ? use(ordersStream) : null;

  // ПАССИВНЫЙ ДЕКЛАРАТИВНЫЙ РИДЕР RAM-КЭША ТАНСТЕКА
  const { data, status } = useQuery<InfiniteOrdersData>({
    queryFn: () => { throw new Error("Observer only") },
    queryKey,
    enabled: false,
  });

  console.log(
    `🧱 [RENDER #${headerDataReaderRenderCount}] HeaderDataReader | ` +
    `Match: ${isServerKeyMatch} | ` +
    `status: ${status} | ` +
    `hasCachedData: ${hasCachedData} | ` +
    `LocationId: ${context.locationId} | ` +
    `Radius: ${context.radius} | globalfetch:${globalIsFetching} `
  );

  const lastStatsSnapshotRef = useRef<{ totalCount: number; loadedCount: number; isReady: boolean } | null>(null);

  // СИНХРОННЫЙ ПРОЦЕССОР СБОРА МЕТРИК ИЗ ЕДИНОГО ИСТОЧНИКА ПРАВДЫ
  const currentStats = useMemo(() => {
    // Сценарий А: Читаем из живого RAM-кэша Танстека (текущий контекст)
    if (hasCachedData && data && data.pages && data.pages.length > 0) {
      const pages = data.pages;
      const firstPageTotal = pages[0]?.total ?? 0;
      const loadedCount = pages.reduce((acc, page) => acc + (page?.orders?.length || 0), 0);

      return {
        totalCount: firstPageTotal,
        loadedCount,
        isReady: true
      };
    }

    // Сценарий Б: Холодный старт (F5). Кэша нет, но ключи совпали — читаем мгновенный ответ из стрима СУБД
    if (serverDataRaw) {
      console.log(`🌱 [HEADER DB FETCH] Кэша нет. Ключи совпали. Читаем мгновенный ответ из стрима.`);
      const unwrapped = unwrap(serverDataRaw, { orders: [], nextCursor: null, total: 0 });
      return {
        totalCount: unwrapped?.total ?? 0,
        loadedCount: unwrapped?.orders?.length || 0,
        isReady: true
      };
    }

    // Сценарий В: Смена радиуса/фильтров на клиенте. Кэша нет, серверный стрим заблокирован затвором.
    return null;
  }, [hasCachedData, data, serverDataRaw]);

  // НАШ ВЫСОКОПРОИЗВОДИТЕЛЬНЫЙ СТАБИЛИЗАТОР ССЫЛОК И УДЕРЖАТЕЛЬ СТЕЙТА (UX-ОПТИМИЗАТОР)
  const stats = useMemo(() => {
    const previous = lastStatsSnapshotRef.current;
    console.log(`lastStatsSnapshotRef: `, previous);

    if (currentStats === null) {
      if (previous) {
        console.log('⏳ [UX KEEP ALIVE] Контекст изменился (радиус/город). Удерживаю старые метрики.');
        return previous;
      }
      return { totalCount: 0, loadedCount: 0, isReady: false };
    }

    if (
      previous &&
      previous.totalCount === currentStats.totalCount &&
      previous.loadedCount === currentStats.loadedCount &&
      previous.isReady === currentStats.isReady
    ) {
      return previous;
    }

    console.log('🔄 [SNAPSHOT MUTATION] Метрики изменились, фиксирую новый стейт хедера.');
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
OrdersPageHeader.displayName = 'OrdersPageHeader';
