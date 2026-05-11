// components/orders/StatsWatcher.tsx
'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'

import { GetOrdersResponse } from '@/actions/order/get-feed'
import { useActiveFeed } from '../layout/FeedController'
import { useFeedStatsStore } from '@/store/use-feed-stats'

export function StatsWatcher() {
    const context = useActiveFeed()
    const setStats = useFeedStatsStore(s => s.setStats)

    // Подглядываем в кэш. Мы не инициализируем загрузку (enabled: false),
    // а просто слушаем изменения по текущему ключу, который создают Feed или Map.
    const { data, isFetching } = useQuery<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>({
        queryKey: ['orders', context.viewMode, context],
        enabled: false,
        // Если TS всё еще ругается на отсутствие queryFn:
        queryFn: () => { throw new Error('StatsWatcher should not fetch') },
        notifyOnChangeProps: ['data', 'isFetching'],
    })

    React.useEffect(() => {
        // Если данных в кэше НЕТ (переключили фильтр, и TanStack Query еще не скачал данные)
        if (!data) {
            // ВАЖНО: Мы ставим total в 0. 
            // Это триггерит условие (totalCount === 0 && isFetching) в хедере и включает СКЕЛЕТОН.
            setStats(0, 0, true)
            return
        }

        let total = 0
        let loaded = 0

        // Типизированный разбор данных
        if (context.viewMode === 'list') {
            const infiniteData = data as unknown as { pages: GetOrdersResponse<'list'>[] }
            const pages = infiniteData.pages || []
            // Берём total из первой страницы
            total = pages[0]?.total ?? 0
            loaded = pages.reduce((acc, page) => acc + (page.orders?.length || 0), 0)
        } else {
            const mapData = data as GetOrdersResponse<'map'>
            total = mapData.total ?? 0
            loaded = mapData.orders?.length || 0
        }

        setStats(total, loaded, isFetching)
    }, [data, isFetching, context.viewMode, setStats])


    return null // Компонент-фантом
}
