'use client';

import { memo } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { FetchingRadar } from '../shared/fetching-radar';
import { OrdersFeed } from '../feed/orders-feed';
import { MapViewport } from '../map/map-viewport';

// Оставляем радар изолированным, это было правильное решение
const GlobalRadar = memo(() => {
    const isFetchingCount = useIsFetching({ queryKey: ["orders"] });
    return <FetchingRadar isVisible={isFetchingCount > 0} />;
});

interface ViewRendererProps {
    viewMode: 'list' | 'map';
}

// Оборачиваем в memo: теперь он рендерится ТОЛЬКО если изменился viewMode
export const ViewRenderer = memo(function ViewRenderer({ viewMode }: ViewRendererProps) {

    return (
        <div className={cn(
            "relative min-h-[700px] transition-all duration-500",
            viewMode === "list" ? "bg-white" : "bg-slate-50"
        )}>
            <GlobalRadar />

            {viewMode === "list" ? (
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
});
