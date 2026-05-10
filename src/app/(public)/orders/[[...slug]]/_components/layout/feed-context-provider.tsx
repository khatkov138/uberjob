"use client"

import * as React from 'react'
import { createContext, useContext, ReactNode } from 'react'
import { FeedContext } from '../../page' // Проверь путь к типам

const ActiveContext = createContext<FeedContext | null>(null);

/**
 * Хук для доступа к шине данных фида
 */
export const useActiveFeed = () => {
    const ctx = useContext(ActiveContext);
    if (!ctx) throw new Error('useActiveFeed must be used within FeedProvider');
    return ctx;
};

/**
 * FeedProvider: Чистая обертка контекста.
 * Вся логика синхронизации временно отключена для отладки "чистого" потока.
 */
export const FeedProvider = ({ value, children }: { value: FeedContext, children: ReactNode }) => {
    return (
        <ActiveContext.Provider value={value}>
            {children}
        </ActiveContext.Provider>
    );
};
