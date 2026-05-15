// src/features/orders/ui/_components/layout/view-renderer.tsx
'use client';

import React, { memo, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { useIsFetching } from '@tanstack/react-query';
import { FetchingRadar } from '../shared/fetching-radar';
import { OrdersFeed } from '../feed/orders-feed';
import { MapViewport } from '../map/map-viewport';
import { OrderCardSkeleton } from '../shared/order-card-skeleton';
import { OrderPreviewSheet } from '../shared/order-preview-sheet';

const GlobalRadar = memo(() => {
    const isFetchingCount = useIsFetching({ queryKey: ["orders"] });
    return <FetchingRadar isVisible={isFetchingCount > 0} />;
});

interface ViewRendererProps {
    viewMode: 'list' | 'map';
}

export const ViewRenderer = memo(function ViewRenderer({ viewMode }: ViewRendererProps) {
    console.log(`🎛️ [RENDER] ViewRenderer | Выбор шлюза Саспенса для режима: ${viewMode.toUpperCase()}`);

    return (
        <div className={cn(
            "relative min-h-[700px] transition-all duration-500",
            viewMode === "list" ? "bg-white" : "bg-slate-50"
        )}>
            <GlobalRadar />

            {viewMode === "list" ? (
                <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    {/* 
                      ИЗОЛИРОВАННЫЙ СУСПЕНС СПИСКА:
                      Ловит саспенд-эффект use(ordersStream) строго внутри этой ветки дерева.
                      Пока идет гидратация F5, крутятся текстовые скелетоны карточек!
                    */}
                    <Suspense fallback={
                        <OrderCardSkeleton />
                    }>
                        <OrdersFeed />
                    </Suspense>
                </div>
            ) : (
                <div className="h-[750px] w-full relative animate-in fade-in zoom-in-95 duration-500">
                    {/* 
                      ИЗОЛИРОВАННЫЙ СУСПЕНС КАРТЫ:
                      Если при первом открытии карты идет фоновый запрос или подгрузка ресурсов,
                      мы больше не показываем текстовые карточки! Включается нативный MapViewport,
                      внутри которого сработает ваш MapPlaceholder (Initializing Engine...).
                    */}
                    <Suspense fallback={null}>
                        <MapViewport />
                        <OrderPreviewSheet />
                    </Suspense>
                </div>
            )}
        </div>
    );
});
