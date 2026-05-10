'use client'

import React from "react";
import { cn } from "@/lib/utils";
// Твоя новая шина
import { useFeedStatsStore } from "@/store/use-feed-stats";
import { useActiveFeed } from "./FeedController";

/**
 * 1. АТОМАРНЫЙ СЧЕТЧИК
 * Изолирован от контекста. Рендерится только когда Zustand меняет цифры.
 */
const HeaderStats = React.memo(() => {
  const totalCount = useFeedStatsStore(s => s.totalCount);
  const loadedCount = useFeedStatsStore(s => s.loadedCount);
  const isFetching = useFeedStatsStore(s => s.isFetching);

  console.log(`📊 [STATS RENDER] Total: ${totalCount}`);

  return (
    <div className="flex items-center gap-3">
      <span className="text-5xl font-black italic text-slate-100">/</span>
      <div className="flex items-baseline">
        <span className="text-6xl font-black italic text-slate-900 tracking-tighter tabular-nums leading-none">
          {totalCount === 0 && isFetching ? "..." : totalCount}
        </span>
        {totalCount > 0 && (
          <div className="flex flex-col ml-2 translate-y-[-4px]">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-0.5">
              Найдено
            </span>
            <span className="text-2xl font-black italic text-slate-300 leading-none tracking-tighter">
              / {loadedCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * 2. ИНДИКАТОР СТАТУСА (Изоляция анимации)
 */
const HeaderStatusBadge = React.memo(() => {
  const isFetching = useFeedStatsStore(s => s.isFetching);

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-500",
      isFetching ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm"
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full", isFetching ? "bg-blue-500 animate-pulse" : "bg-emerald-500")} />
      <span className="tracking-[0.1em] text-[9px] uppercase font-bold">
        {isFetching ? "Синхронизация..." : "Актуально"}
      </span>
    </div>
  );
});

/**
 * 3. ОСНОВНОЙ ХЕДЕР (Techno-minimalism)
 * Полностью автономен. Использует "Бетонный контекст".
 */
export const OrdersPageHeader = React.memo(function OrdersPageHeader() {
  // Достаем всё из шины. Больше никаких пропсов сверху.
  const { name, categoryId } = useActiveFeed();

  // Мы можем договориться, что в FeedController мы добавили categoryName 
  // или просто используем проверку. Если categoryId есть — значит мы в категории.
  // Для педантизма: предполагаем, что name категории мы либо прокинули в контекст, 
  // либо берем из стейта. Пока оставим логику с "Заказы".

  console.log(`🔝 [HEADER RENDER] City: ${name}`);

  return (
    <div className="px-2 pt-4 pb-8 space-y-4">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
          Заказы{" "}
          <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl font-black">
            в {name}
          </span>
        </h2>

        {/* 
           Цифры рендерятся в своем потоке. 
           Когда пользователь крутит радиус, HeaderStats обновится, 
           а текст "Заказы в..." — НЕТ.
        */}
        <HeaderStats />
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic">
        <HeaderStatusBadge />
      </div>
    </div>
  );
});
