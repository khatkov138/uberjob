'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { useFeedStore } from './FeedProvider'
import { FeedContext } from '../../page'
import { StatsWatcher } from '../shared/stats-watcher'

// Слои данных
const StaticContext = createContext<FeedContext | null>(null)
const DynamicContext = createContext<FeedContext | null>(null)

/**
 * АТОМАРНЫЕ ХУКИ
 */

// Для заголовков, координат и города (Стабильный)
export const useStaticFeed = () => {
    const ctx = useContext(StaticContext)
    if (!ctx) throw new Error('useStaticFeed must be used within FeedController')
    return ctx
}

// Для фильтров, радиуса и логики запросов (Реактивный)
export const useActiveFeed = () => {
    const ctx = useContext(DynamicContext)
    if (!ctx) throw new Error('useActiveFeed must be used within FeedController')
    return ctx
}

interface FeedControllerProps {
    serverContext: FeedContext
    currentCategory: { id: string; name: string; slug: string } | null
    children: ReactNode
}

export const FeedController = ({
    serverContext,
    currentCategory,
    children
}: FeedControllerProps) => {
    // 1. Подписка на Zustand (реактивщина)
    const radius = useFeedStore(s => s.radius)
    const viewMode = useFeedStore(s => s.viewMode)

    // 2. Слой ГРАНИТ (Статика из URL/БД)
    // Рендерится только если сменился город или категория в URL
    const staticContext = useMemo((): FeedContext => ({
        ...serverContext,
        categoryId: currentCategory?.id || null,
    }), [serverContext.locationId, serverContext.slug, currentCategory?.id])

    // 3. Слой РТУТЬ (Динамика: гранит + настройки юзера)
    // Рендерится при каждом движении ползунка радиуса
    const activeContext = useMemo((): FeedContext => ({
        ...staticContext,
        radius,
        viewMode,
    }), [staticContext, radius, viewMode])

    return (
        <StaticContext.Provider value={staticContext}>
            <DynamicContext.Provider value={activeContext}>
                <StatsWatcher />
                {children}
            </DynamicContext.Provider>
        </StaticContext.Provider>
    )
}
