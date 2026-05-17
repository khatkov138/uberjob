'use client';

import { use } from 'react';

import { unwrap } from '@/lib/utils';
import { type GetOrdersResponse } from '@/actions/order/get-feed';
import { useOrdersStream } from '../providers/FeedController';
import { useIsomorphicGate } from './useIsomorphicGate';

export function usePromiseOrders(): GetOrdersResponse<'list'> | null {
    const ordersStream = useOrdersStream();
    const { isServerKeyMatch } = useIsomorphicGate();

    // 🎯 БЕЗУСЛОВНЫЙ ВЫЗОВ ВНУТРИ ХУКА ДЛЯ REACT 19
    const resolvedStream = use(ordersStream);
    
    // Если мы на дефолтах F5 — принудительно кастим тип к 'list' для бесконечного фида карточек
    if (isServerKeyMatch) {
        return unwrap(resolvedStream, null) as GetOrdersResponse<'list'> | null;
    }

    return null;
}
