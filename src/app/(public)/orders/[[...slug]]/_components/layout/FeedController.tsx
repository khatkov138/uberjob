// src/features/orders/ui/feed-controller.tsx
'use client';

import React, { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFeedStore } from './FeedProvider';
import { type FeedContext } from '../../page';

import { getMyProfile } from '@/actions/profile/get';
import { handleAction } from '@/lib/utils';
import { type FullProfile } from '@/actions/profile/get';
import { type Session } from '@/lib/auth';
import { type ActionResponse } from '@/lib/server-utils';
import { type GetOrdersResponse } from '@/actions/order/get-feed';

type OrdersStreamPromise = Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;

const StaticContext = createContext<Pick<FeedContext, 'locationId' | 'name' | 'slug' | 'lat' | 'lng'> | null>(null);
const ActiveContext = createContext<FeedContext | null>(null);
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
    children: ReactNode;
}

export const FeedController = ({
    serverContext,
    currentCategory,
    session,
    initialProfile,
    ordersPromise,
    children
}: FeedControllerProps) => {

    // Активный профиль (Подписка строго на данные)
    const { data: profile } = useQuery({
        queryKey: ["user-profile"],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile,
        enabled: !!session?.user,
        staleTime: 1000 * 60 * 30,
        notifyOnChangeProps: ['data'],
    });

    const radius = useFeedStore(s => s.radius);
    const viewMode = useFeedStore(s => s.viewMode);

    // 🧱 СЛОЙ ГРАНИТ через useRef (0 калькуляций на ререндерах)
    const staticPartRef = useRef({
        locationId: serverContext.locationId,
        name: serverContext.name,
        slug: serverContext.slug,
        lat: serverContext.lat,
        lng: serverContext.lng,
    });
    const staticPart = staticPartRef.current;

    // СКИЛЛЫ: Сводим к одной стабильной строке.
    // Если профиль обновился в фоне, но скиллы те же — строка останется идентичной!
    const currentSkillIdsStr = useMemo(() => {
        const activeProfile = profile || initialProfile;
        if (!activeProfile?.skills) return serverContext.skillIds; // Берем готовую серверную строку

        const ids = activeProfile.skills.map(s => s.categoryId);
        return [...ids].sort().join(',');
    }, [profile?.skills, serverContext.skillIds, initialProfile]);

    // 💧 СЛОЙ РТУТЬ: Пересоздает объект ТОЛЬКО при реальном изменении примитивов
    const activeContext = useMemo((): FeedContext => ({
        ...staticPart,
        radius,
        viewMode,
        skillIds: currentSkillIdsStr, // Передаем чистую строку
        categoryId: currentCategory?.id || null,
    }), [
        staticPart,
        radius,
        viewMode,
        currentSkillIdsStr,
        currentCategory?.id
    ]);

    return (
        <StaticContext.Provider value={staticPart}>
            <ActiveContext.Provider value={activeContext}>
                <OrdersStreamContext.Provider value={ordersPromise}>
                    {children}
                </OrdersStreamContext.Provider>
            </ActiveContext.Provider>
        </StaticContext.Provider>
    );
};
