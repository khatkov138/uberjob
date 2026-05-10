// providers/FeedController.tsx
'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'

import { useFeedStore } from './FeedProvider' // Хук от Слоя 1 (Zustand)
import { FeedContext } from '../../page'

const ActiveContext = createContext<FeedContext | null>(null)

/**
 * Главный хук для потребления данных в UI.
 * Больше никаких проверок на undefined — данные есть всегда.
 */
export const useActiveFeed = () => {
    const ctx = useContext(ActiveContext)
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

    // 1. Подписываемся на реактивные настройки из стора (уже гидрированы!)
    const radius = useFeedStore(s => s.radius)
    const viewMode = useFeedStore(s => s.viewMode)

    // 2. Склеиваем всё в единый "бетонный" объект контекста
    const activeContext = useMemo((): FeedContext => ({
        ...serverContext,
        // Эти поля перекрывают серверные значения актуальными данными из стора
        radius,
        viewMode,
        // Актуальная категория из URL/Prisma
        categoryId: currentCategory?.id || null,
    }), [serverContext, radius, viewMode, currentCategory])

    return (
        <ActiveContext.Provider value={activeContext}>
            {children}
        </ActiveContext.Provider>
    )
}
