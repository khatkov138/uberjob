'use client';

import { useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQueryFeedContext, type ExtendedFeedContext } from '../providers/FeedController'; // 🎯 Читаем ExtendedFeedContext
import { type FeedContext as BaseFeedContext } from '../../page';

export type IsomorphicOrdersQueryKey = readonly ['orders', 'list', BaseFeedContext];

export interface IsomorphicGateResult {
  queryKey: IsomorphicOrdersQueryKey;
  isServerKeyMatch: boolean;
  hasCachedData: boolean;
  serverDefaults: BaseFeedContext;
}

export function useIsomorphicGate(): IsomorphicGateResult {
  const fullContext = useQueryFeedContext(); // ⚡️ Вся вселенная фида в одной переменной

  // 🎯 Достаем затвор и эталон бэкенда напрямую из монолитного контекста в одну строчку
  const { initialFeedContextHash, initialFeedContext } = fullContext;
  const queryClient = useQueryClient();

  // Локальный thread-safe кэш парсинга
  const parseCacheRef = useRef<{ hash: string | null; parsed: BaseFeedContext | null }>({
    hash: null,
    parsed: null,
  });

  const serverDefaults = useMemo((): BaseFeedContext => {
    if (parseCacheRef.current.hash === initialFeedContextHash && parseCacheRef.current.parsed) {
      return parseCacheRef.current.parsed;
    }
    try {
      const parsed = JSON.parse(initialFeedContextHash) as BaseFeedContext;
      parseCacheRef.current = { hash: initialFeedContextHash, parsed };
      return parsed;
    } catch (error) {
      console.error('❌ [ZWORK CRITICAL] Failed to parse initialFeedContextHash. Fallback to initialFeedContext:', error);
      return initialFeedContext; // Полный константный эталон
    }
  }, [initialFeedContextHash, initialFeedContext]);

  // Извлекаем примитивы для стабильного массива зависимостей useMemo
  const clientRadius = fullContext.radius;
  const clientViewMode = fullContext.viewMode;
  const clientCategory = fullContext.categoryId ?? null;
  const clientSkillsStr = fullContext.skillIds;

  return useMemo((): IsomorphicGateResult => {
    const serverCategory = serverDefaults.categoryId ?? null;
    const serverSkillsStr = serverDefaults.skillIds ? String(serverDefaults.skillIds) : '';

    // Сверяем плоские примитивы «в лоб» за наносекунды
    const isRadiusMatch = clientRadius === serverDefaults.radius;
    const isViewModeMatch = clientViewMode === serverDefaults.viewMode;
    const isCategoryMatch = clientCategory === serverCategory;
    const isSkillsMatch = clientSkillsStr === serverSkillsStr;

    const isServerKeyMatch = isRadiusMatch && isViewModeMatch && isCategoryMatch && isSkillsMatch;

    // Смешиваем серверные дефолты или отдаем полный монолитный контекст
    const stableContext: BaseFeedContext = isServerKeyMatch
      ? { ...fullContext, ...serverDefaults }
      : fullContext;

    const queryKey: IsomorphicOrdersQueryKey = ['orders', 'list', stableContext];
    const hasCachedData = !!queryClient.getQueryData(queryKey);

    return {
      queryKey,
      isServerKeyMatch,
      hasCachedData,
      serverDefaults
    };
    // 🎯 Упростили массив зависимостей: убрали initialFeedContextHash, так как следим за serverDefaults
  }, [serverDefaults, clientRadius, clientViewMode, clientCategory, clientSkillsStr, queryClient, fullContext]);
}
