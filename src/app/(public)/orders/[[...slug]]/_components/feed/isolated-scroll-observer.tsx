/**
 * ИЗОЛИРОВАННЫЙ ТРИГГЕР СКРОЛЛА
 * Используем key={allOrdersLength} для принудительного ремаунта.
 * Это гарантирует, что если после загрузки страницы триггер всё еще в зоне видимости,
 * он сработает повторно без необходимости двигать скролл.
 * 
 * 
 * 
 */

import React from "react";

import { useIsFetching } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Loader2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedContext } from "../providers/FeedController";
import { FeedContext } from "../../page";

interface IsolatedScrollObserverProps {
    queryKey: readonly ['orders', 'list', FeedContext];
    ordersCount: number;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    isError: boolean;
}

/**
 * 3. АТОМАРНЫЙ ТРИГГЕР СКРОЛЛА
 * Он забирает флаг фетчинга точечно через useIsFetching.
 * При подгрузке страниц рендерится ТОЛЬКО этот маленький компонент, а ядро фида молчит.
 */
export const IsolatedScrollObserver = React.memo(function IsolatedScrollObserver({
    queryKey,
    ordersCount,
    hasNextPage,
    fetchNextPage,
    isError
}: IsolatedScrollObserverProps) {
    // Получаем количество фетчей конкретно по нашему ключу (0 или 1)
    const isFetching = useIsFetching({ queryKey: queryKey as unknown as any[] }) > 0;

    return (
        <ScrollObserver
            key={`trigger-${ordersCount}`}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={isFetching} // Отдаем изолированный флаг
            isError={isError}
        />
    );
});

const ScrollObserver = React.memo(({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage, // Передаем извне
    isError
}: {
    hasNextPage: boolean | undefined,
    fetchNextPage: () => void,
    isFetchingNextPage: boolean,
    isError: boolean
}) => {


    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '600px' // Чуть увеличим для плавности
    });

    React.useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage && !isError) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

    if (!hasNextPage && !isError) return null;

    return (
        <div ref={ref} className="w-full py-20 flex flex-col items-center justify-center">

            {/* СОСТОЯНИЕ ОШИБКИ */}
            {isError ? (
                <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="h-[2px] w-12 bg-red-500/20" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">SYNC / FAILED</span>
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        </div>
                        <div className="h-[2px] w-12 bg-red-500/20" />
                    </div>

                    <div className="text-center space-y-2">
                        <h4 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                            Ошибка <span className="text-red-500">связи</span>
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
                            Проверьте интернет и попробуйте снова
                        </p>
                    </div>

                    <button
                        disabled={isFetchingNextPage}
                        onClick={() => fetchNextPage()}
                        className={cn(
                            "group flex items-center gap-6 px-10 py-6 rounded-[2.5rem] transition-all duration-500",
                            "bg-slate-900 text-white font-black uppercase italic tracking-tighter text-xl shadow-xl",
                            "hover:scale-[1.02] active:scale-95 hover:bg-red-500 disabled:opacity-50 disabled:grayscale"
                        )}
                    >
                        {isFetchingNextPage ? (
                            <>
                                <span>Загрузка...</span>
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </>
                        ) : (
                            <>
                                <span>Повторить</span>
                                <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                                    <RefreshCcw className="w-6 h-6" />
                                </div>
                            </>
                        )}
                    </button>
                </div>
            ) : (
                /* СТАНДАРТНЫЙ ЛОАДЕР (при скролле) */
                isFetchingNextPage && (
                    <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-1 h-1 bg-blue-600 rounded-full animate-ping" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">
                                Next / Batch
                            </span>
                        </div>
                    </div>
                )
            )}
        </div>
    );
});
