'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { type FeedContext } from '../../page';
import { getMyProfile, type FullProfile } from '@/actions/profile/get';
import { handleAction } from '@/lib/utils';
import { type Session } from '@/lib/auth';
import { type ActionResponse } from '@/lib/server-utils';
import { type GetOrdersResponse } from '@/actions/order/get-feed';
import { useFeedStore } from './FeedProvider';

type OrdersStreamPromise = Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;

export interface StaticFeedContextType extends Pick<FeedContext, 'locationId' | 'name' | 'slug' | 'lat' | 'lng'> {
    initialServerHash: string;
}
export type ActiveFeedContextType = Pick<FeedContext, 'radius' | 'viewMode' | 'skillIds' | 'categoryId'>;

const StaticContext = createContext<StaticFeedContextType | null>(null);
const ActiveContext = createContext<ActiveFeedContextType | null>(null);
const QueryContext = createContext<FeedContext | null>(null);
const OrdersStreamContext = createContext<OrdersStreamPromise | null>(null);

export const useStaticFeed = () => {
    const ctx = useContext(StaticContext);
    if (!ctx) throw new Error('useStaticFeed missing');
    return ctx;
};

export const useActiveFeed = () => {
    const ctx = useContext(ActiveContext);
    if (!ctx) throw new Error('useActiveFeed missing');
    return ctx;
};

export const useQueryFeedContext = () => {
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

interface FeedControllerProps {
    serverContext: FeedContext;
    currentCategory: { id: string; name: string; slug: string } | null;
    session: Session | null;
    initialProfile: FullProfile | null;
    ordersPromise: OrdersStreamPromise;
    initialServerHash: string;
    children: ReactNode;
}

let controllerRenderCount = 0;

// 🧱 Обертываем в React.memo, защищая контекст от случайных ререндеров макета сверху
export const FeedController = React.memo(function FeedController({
    serverContext,
    currentCategory,
    session,
    initialProfile,
    ordersPromise,
    initialServerHash,
    children
}: FeedControllerProps) {
    controllerRenderCount++;

    console.log(`🎛️  [CONTROLLER ENTRY #${controllerRenderCount}] Инициализация жизненного цикла FeedController.`);

    const { data: profile } = useQuery({
        queryKey: ["user-profile"],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile,
        enabled: !!session?.user,
        staleTime: 1000 * 60 * 30,
        notifyOnChangeProps: ['data'],
    });

    // ⚡️ АТОМАРНЫЙ ВЫБОР СТЭЙТА: Извлекаем примитивы напрямую.
    // Больше никаких useShallow и деструктуризаций объектов! Ререндер только при изменении цифр/строк.
    const radius = useFeedStore(s => s.radius);
    const viewMode = useFeedStore(s => s.viewMode);

    // 🎯 СКИЛЛЫ: Изоморфная стабилизация без ссылочного дребезга массивов и объектов.
    // Сравниваем зависимости строго по примитивным строкам идентификаторов.
    const currentSkillIdsStr = useMemo(() => {
        const targetSkills = profile?.skills ?? initialProfile?.skills;

        if (targetSkills && targetSkills.length > 0) {
            return targetSkills.map(s => s.categoryId).sort().join(',');
        }

        return serverContext.skillIds || '';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        profile?.skills?.map(s => s.categoryId).sort().join(','),
        initialProfile?.skills?.map(s => s.categoryId).sort().join(','),
        serverContext.skillIds
    ]);

    // 💧 СЛОЙ РТУТЬ (Динамика фильтров) — ссылка стабильна, пока не изменятся примитивы фильтров
    const activeContext = useMemo((): ActiveFeedContextType => {
        return {
            radius,
            viewMode,
            skillIds: currentSkillIdsStr,
            categoryId: currentCategory?.id || null,
        };
    }, [radius, viewMode, currentSkillIdsStr, currentCategory?.id]);

    // 🧱 СЛОЙ ГРАНИТ (Статика — жесткий кэш по примитивам)
    const staticPart = useMemo((): StaticFeedContextType => {
        return {
            locationId: serverContext.locationId,
            name: serverContext.name,
            slug: serverContext.slug,
            lat: serverContext.lat,
            lng: serverContext.lng,
            initialServerHash
        };
    }, [
        serverContext.locationId,
        serverContext.name,
        serverContext.slug,
        serverContext.lat,
        serverContext.lng,
        initialServerHash
    ]);

    // 🪄 МОНОЛИТНЫЙ ОБЪЕКТ ЗАПРОСА — собирает слои без побочных эффектов
    const fullQueryContext = useMemo((): FeedContext => {
        return {
            locationId: staticPart.locationId,
            name: staticPart.name,
            slug: staticPart.slug,
            lat: staticPart.lat,
            lng: staticPart.lng,
            radius: activeContext.radius,
            viewMode: activeContext.viewMode,
            skillIds: activeContext.skillIds,
            categoryId: activeContext.categoryId,
        };
    }, [staticPart, activeContext]);

    console.log(`🏁 [CONTROLLER COMMIT #${controllerRenderCount}] Контексты сформированы, JSX уходит в провайдеры.`);

    return (
        <StaticContext.Provider value={staticPart}>
            <ActiveContext.Provider value={activeContext}>
                <QueryContext.Provider value={fullQueryContext}>
                    <OrdersStreamContext.Provider value={ordersPromise}>
                        {children}
                    </OrdersStreamContext.Provider>
                </QueryContext.Provider>
            </ActiveContext.Provider>
        </StaticContext.Provider>
    );
});
