'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { serializeDeterministic } from '@/lib/utils';
import { FeedContext } from '../../page';
import { useFeedContext, useInitialData } from '../providers/FeedController';

export type IsomorphicOrdersQueryKey = readonly ['orders', 'list', FeedContext];

export interface IsomorphicGateResult {
  queryKey: IsomorphicOrdersQueryKey;
  isServerKeyMatch: boolean;
  hasCachedData: boolean;
}

export function useIsomorphicGate(): IsomorphicGateResult {
  const queryClient = useQueryClient();
  const feedContext = useFeedContext(); // Железная стабильная ссылка из твоего контроллера
  const { initialFeedContextHash } = useInitialData(); // Алфавитная строка с сервера

  return useMemo((): IsomorphicGateResult => {
    // 1. Быстрое алфавитное хэширование
    const currentHash = serializeDeterministic(feedContext);

    // 2. Сверяем хэши строк — это единственный затвор для Edge-потока
    const isMatch = currentHash === initialFeedContextHash;

    // 3. Танстек получает чистый контекст напрямую. Ссылка стабильна из-за useMemo в контроллере!
    const queryKey: IsomorphicOrdersQueryKey = ['orders', 'list', feedContext];
    const hasCachedData = !!queryClient.getQueryData(queryKey);

    return {
      queryKey,
      isServerKeyMatch: isMatch,
      hasCachedData
    };
  }, [feedContext, initialFeedContextHash, queryClient]);
}
