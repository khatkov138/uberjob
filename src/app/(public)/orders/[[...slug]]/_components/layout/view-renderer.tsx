'use client';

import { useOrdersStore } from '@/store/use-orders-store';
import { useIsFetching } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { FetchingRadar } from '../shared/fetching-radar';
import { OrdersFeed } from '../feed/orders-feed';
import { MapViewport } from '../map/map-viewport';

export function ViewRenderer({ initialViewMode }: { initialViewMode: "map" | "list" }) {
    const viewMode = useOrdersStore((state) => state.viewMode);
    const isReady = useOrdersStore((state) => state._hasHydrated);

    // Подсчитываем ЛЮБЫЕ активные фетчинги, ключ которых начинается с "orders"
    // Это поймает и ["orders", "list", ...] и ["orders", "map", ...]
    const isFetchingCount = useIsFetching({
        queryKey: ["orders"]
    });

    const activeViewMode = isReady ? viewMode : initialViewMode;
    const isAnyFetching = isFetchingCount > 0;

    return (
        <div className={cn(
            "relative min-h-[700px] transition-all duration-500",
            activeViewMode === "list" ? "bg-white" : "bg-slate-50"
        )}>
            {/* Радар крутится, если в системе идет подгрузка любых заказов */}
            <FetchingRadar isVisible={isAnyFetching} />

            {activeViewMode === "list" ? (
                <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <OrdersFeed />
                </div>
            ) : (
                <div className="h-[750px] w-full relative animate-in fade-in zoom-in-95 duration-500">
                    <MapViewport />
                </div>
            )}
        </div>
    );
}
