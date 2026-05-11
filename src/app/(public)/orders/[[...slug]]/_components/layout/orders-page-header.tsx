'use client'

import React from "react";
import { cn } from "@/lib/utils";
import { useFeedStatsStore } from "@/store/use-feed-stats";
import { useActiveFeed } from "./FeedController";

/**
 * 1. СКЕЛЕТОН СТАТИСТИКИ
 * Идеально повторяет геометрию цифр, чтобы исключить Layout Shift.
 */
const StatsSkeleton = () => (
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

/**
 * 2. АТОМАРНЫЙ СЧЕТЧИК
 * Изолирован от основного хедера. Высота h-[60px] зацементирована.
 */
const HeaderStats = React.memo(() => {
  const totalCount = useFeedStatsStore(s => s.totalCount);
  const loadedCount = useFeedStatsStore(s => s.loadedCount);
  const isFetching = useFeedStatsStore(s => s.isFetching);

  // Скелетон виден, пока totalCount не изменился с -1 (начальное состояние)
  // или пока идет первичный захват данных (total 0 и fetching true)
  const showSkeleton = totalCount === -1 || (totalCount === 0 && isFetching);

  return (
    <div className="flex items-center h-[60px] min-w-[140px]">
      {showSkeleton ? (
        <StatsSkeleton />
      ) : (
        <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
          <span className="text-5xl font-black italic text-slate-100">/</span>
          <div className="flex items-baseline">
            <span className="text-6xl font-black italic text-slate-900 tracking-tighter tabular-nums leading-none">
              {totalCount}
            </span>
            {totalCount > 0 && (
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
 * 3. ИНДИКАТОР СТАТУСА (Изоляция анимации)
 */
const HeaderStatusBadge = React.memo(() => {
  const isFetching = useFeedStatsStore(s => s.isFetching);
  const totalCount = useFeedStatsStore(s => s.totalCount);

  // Не показываем статус, пока не было первой загрузки (totalCount === -1)
  if (totalCount === -1) return <div className="h-[22px] w-24 bg-slate-50 animate-pulse rounded-lg" />;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-500 h-[22px]",
      isFetching ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm"
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full", isFetching ? "bg-blue-500 animate-pulse" : "bg-emerald-500")} />
      <span className="tracking-[0.1em] text-[9px] uppercase font-bold whitespace-nowrap">
        {isFetching ? "Синхронизация..." : "Актуально"}
      </span>
    </div>
  );
});

/**
 * 4. ОСНОВНОЙ ХЕДЕР
 */
export const OrdersPageHeader = React.memo(function OrdersPageHeader() {
  const { name } = useActiveFeed();

  return (
    <div className="px-2 pt-4 pb-8 space-y-4">
      <div className="flex items-baseline gap-4 flex-wrap min-h-[60px]">
        {/* h1 всегда занимает высоту, даже если текст переносится */}
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none py-1">
          Заказы{" "}
          <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl font-black">
            в {name}
          </span>
        </h1>

        {/* Счётчик не "толкает" заголовок, так как имеет фиксированный контейнер */}
        <HeaderStats />
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic h-[22px]">
        <HeaderStatusBadge />
      </div>
    </div>
  );
});
