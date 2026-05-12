'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFeedStore } from './FeedProvider'
import { FeedContext } from '../../page'

import { getMyProfile } from '@/actions/profile/get'
import { handleAction } from '@/lib/utils'
import { FullProfile } from '@/actions/profile/get'
import { Session } from '@/lib/auth'
import { ActionResponse } from '@/lib/server-utils'
import { GetOrdersResponse } from '@/actions/order/get-feed'

// Определяем строгий тип для нашего стриминг-промиса
type OrdersStreamPromise = Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;

// 1. КОНТЕНТНЫЕ КОНТЕКСТЫ
const StaticContext = createContext<Pick<FeedContext, 'locationId' | 'name' | 'slug' | 'lat' | 'lng'> | null>(null)
const ActiveContext = createContext<FeedContext | null>(null)

// 2. ИЗОЛИРОВАННЫЙ КОНТЕКСТ ДЛЯ СТРЕМИНГА ПРОМИСА (Замена any на строгий тип)
const OrdersStreamContext = createContext<OrdersStreamPromise | null>(null)

export const useStaticFeed = () => {
    const ctx = useContext(StaticContext)
    if (!ctx) throw new Error('useStaticFeed missing')
    return ctx
}

export const useActiveFeed = () => {
    const ctx = useContext(ActiveContext)
    if (!ctx) throw new Error('useActiveFeed missing')
    return ctx
}

// Хук для нативного забора промиса в фиде (Строго типизирован на выходе)
export const useOrdersStream = (): OrdersStreamPromise => {
    const ctx = useContext(OrdersStreamContext)
    if (!ctx) throw new Error('useOrdersStream missing. Ensure component is under FeedController')
    return ctx
}

interface FeedControllerProps {
    serverContext: FeedContext
    currentCategory: { id: string; name: string; slug: string } | null
    session: Session | null
    initialProfile: FullProfile | null
    ordersPromise: OrdersStreamPromise; // Принимаем строго типизированный промис
    children: ReactNode
}

export const FeedController = ({
    serverContext,
    currentCategory,
    session,
    initialProfile,
    ordersPromise,
    children
}: FeedControllerProps) => {

    // Активный профиль
    const { data: profile } = useQuery({
        queryKey: ["user-profile"],
        queryFn: () => handleAction(getMyProfile()),
        initialData: initialProfile,
        enabled: !!session?.user,
        staleTime: 1000 * 60 * 30,
        notifyOnChangeProps: ['data'],
    })

    const radius = useFeedStore(s => s.radius)
    const viewMode = useFeedStore(s => s.viewMode)

    // Слой ГРАНИТ
    const staticPart = useMemo(() => ({
        locationId: serverContext.locationId,
        name: serverContext.name,
        slug: serverContext.slug,
        lat: serverContext.lat,
        lng: serverContext.lng,
    }), [serverContext.locationId, serverContext.slug])

    // СКИЛЛЫ
    const currentSkillIds = useMemo(() => {
        const activeProfile = profile || initialProfile
        const ids = activeProfile?.skills?.map(s => s.categoryId) || serverContext.skillIds || []
        return [...ids].sort()
    }, [profile, serverContext.skillIds, initialProfile])

    // Слой РТУТЬ (Чистые сериализуемые данные для queryKey, БЕЗ промисов внутри!)
    const activeContext = useMemo((): FeedContext => ({
        ...staticPart,
        radius,
        viewMode,
        skillIds: currentSkillIds,
        categoryId: currentCategory?.id || null,
        name: staticPart.name,
        slug: staticPart.slug
    } as FeedContext), [
        staticPart,
        radius,
        viewMode,
        JSON.stringify(currentSkillIds),
        currentCategory?.id
    ])

    return (
        <StaticContext.Provider value={staticPart}>
            <ActiveContext.Provider value={activeContext}>
                {/* Оборачиваем стрим в пассивный контекст без десинхронизации */}
                <OrdersStreamContext.Provider value={ordersPromise}>
                    {children}
                </OrdersStreamContext.Provider>
            </ActiveContext.Provider>
        </StaticContext.Provider>
    )
}
