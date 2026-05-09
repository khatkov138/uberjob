import { cn } from "@/lib/utils";
import { useFeedDataStore } from "@/store/use-feed-data-store";
import { useActiveFeed } from "./feed-context-provider";
import React from "react";

/**
 * 1. АТОМАРНЫЙ СЧЕТЧИК (Следит только за Zustand)
 * Он не знает про контекст, поэтому рендерится ТОЛЬКО при изменении цифр
 */
const HeaderStats = React.memo(() => {
  const totalCount = useFeedDataStore(s => s.totalCount);
  const loadedCount = useFeedDataStore(s => s.loadedCount);
  const isFetching = useFeedDataStore(s => s.isFetching);

  console.log(`📊 [STATS RENDER] Total: ${totalCount} | Loaded: ${loadedCount}`);

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
              Loaded
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
 * 2. ИНДИКАТОР СТАТУСА (Выделен в атом для изоляции анимаций)
 */
const HeaderStatusBadge = React.memo(() => {
  const isFetching = useFeedDataStore(s => s.isFetching);
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-500",
      isFetching ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm"
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full", isFetching ? "bg-blue-500 animate-pulse" : "bg-emerald-500")} />
      <span className="tracking-[0.1em]">{isFetching ? "Синхронизация..." : "Актуально"}</span>
    </div>
  );
});

/**
 * 3. ОСНОВНОЙ ХЕДЕР
 */
export const OrdersPageHeader = React.memo(function OrdersPageHeader({
  currentCategory
}: {
  currentCategory: { name: string } | null
}) {
  const context = useActiveFeed();

  // Этот лог теперь будет срабатывать реже или проходить "вхолостую" для DOM
  console.log(`🔝 [HEADER RENDER] City: ${context.name}`);

  return (
    <div className="px-2 pt-4 pb-8 space-y-4">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
          {currentCategory ? (
            <>
              {currentCategory.name}{" "}
              <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl font-black">
                в {context.name}
              </span>
            </>
          ) : (
            <>
              Заказы{" "}
              <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl font-black">
                в {context.name}
              </span>
            </>
          )}
        </h2>

        {/* Цифры изолированы в отдельный поток рендеринга */}
        <HeaderStats />
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic">
        <HeaderStatusBadge />
      </div>
    </div>
  );
});
