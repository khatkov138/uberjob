'use client';

import { useOrdersStore } from '@/store/use-orders-store';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { FeedContext } from '../../page';
import { FetchingRadar } from '../shared/fetching-radar';
import { OrdersFeed } from '../feed/orders-feed';
import { MapViewport } from '../map/map-viewport';

export function ViewRenderer({ initialViewMode }: { initialViewMode: "map" | "list" }) {
    const viewMode = useOrdersStore((state) => state.viewMode);
    const isReady = useOrdersStore((state) => state._hasHydrated);

    const { data: context } = useQuery<FeedContext>({
        queryKey: ['feed-context'],
        queryFn: () => { throw new Error("Observer: feed-context is missing") },
        enabled: false
    });

    // Подписка на бесконечный список
    const infiniteQuery = useQuery({
        queryKey: ["orders", "list", context],
        queryFn: () => { throw new Error("Observer: infinite orders data is missing") },
        enabled: false,
    });

    // Подписка на карту
    const mapQuery = useQuery({
        queryKey: ["orders", "map", context],
        queryFn: () => { throw new Error("Observer: map orders data is missing") },
        enabled: false,
    });

    const activeViewMode = isReady ? viewMode : initialViewMode;
    const isAnyFetching = infiniteQuery.isFetching || mapQuery.isFetching;

    return (
        <div className={cn(
            "relative min-h-[700px] transition-all duration-500",
            activeViewMode === "list" ? "bg-white" : "bg-slate-50"
        )}>
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
