import { useFeedDataStore } from "@/store/use-feed-data-store";
import { useActiveFeed } from "./feed-context-provider";
import React from "react";
import { cn } from "@/lib/utils";

export const OrdersPageHeader = React.memo(function OrdersPageHeader({
  currentCategory
}: {
  currentCategory: { name: string } | null
}) {
  const context = useActiveFeed();

  // 1. Читаем данные из нашего "быстрого" стора
  const totalCount = useFeedDataStore(s => s.totalCount);
  const isFetching = useFeedDataStore(s => s.isFetching);

  // ЛОГ ДЛЯ ПРОВЕРКИ
  console.log(`🔝 [RENDER] OrdersPageHeader | Total: ${totalCount} | City: ${context.name}`);

  return (
    <div className="px-2 pt-4 pb-8 space-y-4">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
          {currentCategory ? (
            <>
              {currentCategory.name}{" "}
              <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl">
                в {context.name}
              </span>
            </>
          ) : (
            <>
              Заказы{" "}
              <span className="text-blue-600 ml-2 whitespace-nowrap text-4xl">
                в {context.name}
              </span>
            </>
          )}
        </h2>

        <div className="flex items-center gap-3">
          <span className="text-5xl font-black italic text-slate-100">/</span>
          {/* Цифра теперь просто выводится из стора */}
          <span className="text-5xl font-black italic text-slate-900 tracking-tighter tabular-nums">
            {totalCount === 0 && isFetching ? "..." : totalCount}
          </span>
        </div>
      </div>

      {/* Индикатор загрузки (точка) */}
      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic">
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-all duration-300",
          isFetching ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
        )}>
          <div className={cn("w-1 h-1 rounded-full", isFetching ? "bg-blue-500 animate-pulse" : "bg-emerald-500")} />
          <span>{isFetching ? "Обновление..." : "Актуально"}</span>
        </div>
      </div>
    </div>
  );
});
