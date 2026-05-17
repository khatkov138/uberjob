'use client';

import React, { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from 'zustand';


import { getMyProfile, type FullProfile } from '@/actions/profile/get';
import { handleAction } from '@/lib/utils';
import { type ActionResponse } from '@/lib/server-utils';
import { type GetOrdersResponse } from '@/actions/order/get-feed';
import { createFeedStore, type FeedState } from "@/store/use-feed-store";
import { FeedContext, InitialFeedData } from '../../page';

type OrdersStreamPromise = Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;
type FeedStoreApi = ReturnType<typeof createFeedStore>;

const FeedContextInstance = createContext<FeedContext | null>(null);
const InitialDataContext = createContext<InitialFeedData | null>(null);
const OrdersStreamContext = createContext<OrdersStreamPromise | null>(null);
const FeedStoreContext = createContext<FeedStoreApi | null>(null);

// 🔌 ХУК №1: Чистый плоский контекст фида для TanStack Query ключа и API
export const useFeedContext = (): FeedContext => {
    const ctx = useContext(FeedContextInstance);
    if (!ctx) throw new Error('useFeedContext missing');
    return ctx;
};

// 🔌 ХУК №2: Неизменяемая текстовая статика для рендеринга шапки, SEO-заголовков и модалок
export const useInitialData = (): InitialFeedData => {
    const ctx = useContext(InitialDataContext);
    if (!ctx) throw new Error('useInitialData missing');
    return ctx;
};

// 🔌 ХУК №3: Твой канонический хук с дженериком для точечного сужения типов во вложенных слоях фида/карты
export const useOrdersStream = <M extends 'list' | 'map' = 'list' | 'map'>(): Promise<
    ActionResponse<GetOrdersResponse<M>>
> => {
    const ctx = useContext(OrdersStreamContext);
    if (!ctx) throw new Error('useOrdersStream missing');
    return ctx as Promise<ActionResponse<GetOrdersResponse<M>>>;
};

// 🔌 ХУК №4: Интерфейс к Zustand-стору клиента
export function useFeedStore<T>(selector: (state: FeedState) => T): T {
    const context = useContext(FeedStoreContext);
    if (!context) throw new Error('useFeedStore must be used within FeedController');
    return useStore(context, selector);
}

interface FeedControllerProps {
    initialFeedContext: FeedContext;
    initialFeedData: InitialFeedData;
    initialProfile: FullProfile | null;
    ordersPromise: OrdersStreamPromise;
    children: ReactNode;
}

let controllerRenderCount = 0;

export const FeedController = React.memo(function FeedController({
    initialFeedContext,
    initialFeedData,
    initialProfile,
    ordersPromise,
    children
}: FeedControllerProps) {
    controllerRenderCount++;

    console.log(`🎛️  [CONTROLLER ENTRY #${controllerRenderCount}] Инициализация жизненного цикла FeedController.`);

    // 🔒 Zustand: Инициализируем реактивный стор из серверных параметров строго один раз
    const storeRef = useRef<FeedStoreApi | null>(null);
    if (!storeRef.current) {
        storeRef.current = createFeedStore({
            radius: initialFeedContext.radius,
            viewMode: initialFeedContext.viewMode
        });
    }

    // Твой оригинальный рабочий блок профиля Танстека с защитой от холостых сетевых ударов
    const { data: profile } = useQuery({
        queryKey: ["user-profile"],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile,
        enabled: !!initialProfile,
        staleTime: 1000 * 60 * 30,
        notifyOnChangeProps: ['data'],
    });

    // Извлекаем динамику из Zustand-стора клиента
    const radius = useStore(storeRef.current, s => s.radius);
    const viewMode = useStore(storeRef.current, s => s.viewMode);

    // Изоморфная стабилизация строки скиллов (БЕЗ ПАДЕНИЯ В СЕРВЕРНЫЙ ДЕФОЛТ ПРИ ОЧИСТКЕ КЭША)
    const currentSkillIdsStr = useMemo((): string => {
        if (profile) return (profile.skills ?? []).map(s => s.categoryId).sort().join(',');
        if (initialProfile) return (initialProfile.skills ?? []).map(s => s.categoryId).sort().join(',');
        return initialFeedContext.skillIds || '';
    }, [profile?.skills, initialProfile?.skills, initialFeedContext.skillIds]);

    // 🎯 СБОРКА ДИНАМИЧЕСКОГО КОНТЕКСТА: Только плоские примитивы для Танстека
    const dynamicFeedContext = useMemo((): FeedContext => {
        return {
            locationId: initialFeedContext.locationId,
            lat: initialFeedContext.lat,
            lng: initialFeedContext.lng,
            radius,
            viewMode,
            skillIds: currentSkillIdsStr,
            categoryId: initialFeedContext.categoryId
        };
    }, [initialFeedContext, radius, viewMode, currentSkillIdsStr]);

    console.log(`🏁 [CONTROLLER COMMIT #${controllerRenderCount}] Контексты изолированы, JSX уходит в провайдеры.`);

    return (
        <FeedStoreContext.Provider value={storeRef.current}>
            <InitialDataContext.Provider value={initialFeedData}>
                <OrdersStreamContext.Provider value={ordersPromise}>
                    <FeedContextInstance.Provider value={dynamicFeedContext}>
                        {children}
                    </FeedContextInstance.Provider>
                </OrdersStreamContext.Provider>
            </InitialDataContext.Provider>
        </FeedStoreContext.Provider>
    );
});

FeedController.displayName = 'FeedController';
