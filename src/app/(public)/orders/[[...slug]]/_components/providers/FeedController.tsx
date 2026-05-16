'use client';

import React, { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from 'zustand';

import { type FeedContext as BaseFeedContext } from '../../page';
import { getMyProfile, type FullProfile } from '@/actions/profile/get';
import { handleAction } from '@/lib/utils';
import { type ActionResponse } from '@/lib/server-utils';
import { type GetOrdersResponse } from '@/actions/order/get-feed';
import { createFeedStore, type FeedState } from "@/store/use-feed-store";

type OrdersStreamPromise = Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;
type FeedStoreApi = ReturnType<typeof createFeedStore>;

// 🎯 СТРОГОЕ РАСШИРЕНИЕ: Описываем технический затвор для TypeScript без изменения базового типа страницы
export interface ExtendedFeedContext extends BaseFeedContext {
    initialFeedContextHash: string;
    initialFeedContext: BaseFeedContext;
}

const QueryContext = createContext<ExtendedFeedContext | null>(null);
const OrdersStreamContext = createContext<OrdersStreamPromise | null>(null);
const FeedStoreContext = createContext<FeedStoreApi | null>(null);

// 🔌 УЛЬТИМАТИВНЫЙ И ЕДИНСТВЕННЫЙ ХУК ДЛЯ ВСЕГО ЯДРА ФИДА
export const useQueryFeedContext = (): ExtendedFeedContext => {
    const ctx = useContext(QueryContext);
    if (!ctx) throw new Error('useQueryFeedContext missing');
    return ctx;
};

export const useOrdersStream = <M extends 'list' | 'map' = 'list' | 'map'>(): Promise<
    ActionResponse<GetOrdersResponse<M>>
> => {
    const ctx = useContext(OrdersStreamContext);
    if (!ctx) throw new Error('useOrdersStream missing');
    return ctx as Promise<ActionResponse<GetOrdersResponse<M>>>;
};

export function useFeedStore<T>(selector: (state: FeedState) => T): T {
    const context = useContext(FeedStoreContext);
    if (!context) throw new Error('useFeedStore must be used within FeedController');
    return useStore(context, selector);
}

interface FeedControllerProps {
    initialFeedContext: BaseFeedContext;
    currentCategory: { id: string; name: string; slug: string } | null;
    initialProfile: FullProfile | null; // 🎯 Пропс session удален за избыточностью
    ordersPromise: OrdersStreamPromise;
    children: ReactNode;
}

let controllerRenderCount = 0;

export const FeedController = React.memo(function FeedController({
    initialFeedContext,
    currentCategory,
    initialProfile,
    ordersPromise,
    children
}: FeedControllerProps) {
    controllerRenderCount++;

    console.log(`🎛️  [CONTROLLER ENTRY #${controllerRenderCount}] Инициализация жизненного цикла FeedController.`);

    // 🔒 Читаем радиус и режим напрямую из серверного контекста фида при инициализации стора
    const storeRef = useRef<FeedStoreApi | null>(null);
    if (!storeRef.current) {
        storeRef.current = createFeedStore({
            radius: initialFeedContext.radius,
            viewMode: initialFeedContext.viewMode
        });
    }

    // 🔒 СЕРВЕРНЫЙ ЗАТВОР: Сериализуем стартовый контекст строго один раз при F5
    const initialFeedContextHash = useMemo((): string => {
        return JSON.stringify(initialFeedContext);
    }, [initialFeedContext]);

    // Твой оригинальный рабочий блок профиля Танстека с оптимизированным затвором сети
    const { data: profile } = useQuery({
        queryKey: ["user-profile"],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile,
        enabled: !!initialProfile, // ⚡️ Завязано на профиль, холостой сетевой удар заблокирован намертво!
        staleTime: 1000 * 60 * 30,
        notifyOnChangeProps: ['data'],
    });

    // Атомарный выбор примитивов напрямую из Zustand-стора
    const radius = useStore(storeRef.current, s => s.radius);
    const viewMode = useStore(storeRef.current, s => s.viewMode);

    // Изоморфная стабилизация строки скиллов (БЕЗ ПАДЕНИЯ В СЕРВЕРНЫЙ ДЕФОЛТ ПРИ ОЧИСТКЕ)
    const currentSkillIdsStr = useMemo((): string => {
        if (profile) {
            const targetSkills = profile.skills ?? [];
            return targetSkills.map(s => s.categoryId).sort().join(',');
        }
        if (initialProfile) {
            const targetSkills = initialProfile.skills ?? [];
            return targetSkills.map(s => s.categoryId).sort().join(',');
        }
        return initialFeedContext.skillIds || '';
    }, [profile?.skills, initialProfile?.skills, initialFeedContext.skillIds]);

    // 🪄 МОНОЛИТНЫЙ ОБЪЕКТ СВЕРХ-КОНТЕКСТА: Содержит в себе вообще все слои приложения
    const fullQueryContext = useMemo((): ExtendedFeedContext => {
        return {
            // Гео-ядро и URL статика
            locationId: initialFeedContext.locationId,
            name: initialFeedContext.name,
            slug: initialFeedContext.slug,
            lat: initialFeedContext.lat,
            lng: initialFeedContext.lng,
            categoryId: currentCategory?.id || null, // Железная URL статика

            // Динамика UI фильтров клиента
            radius,
            viewMode,
            skillIds: currentSkillIdsStr,

            // Технический изоморфный затвор для гейта
            initialFeedContextHash,
            initialFeedContext
        };
    }, [initialFeedContext, currentCategory?.id, radius, viewMode, currentSkillIdsStr, initialFeedContextHash]);

    console.log(`🏁 [CONTROLLER COMMIT #${controllerRenderCount}] Контексты сформированы, JSX уходит в провайдеры.`);

    return (
        <FeedStoreContext.Provider value={storeRef.current}>
            <QueryContext.Provider value={fullQueryContext}>
                <OrdersStreamContext.Provider value={ordersPromise}>
                    {children}
                </OrdersStreamContext.Provider>
            </QueryContext.Provider>
        </FeedStoreContext.Provider>
    );
});
