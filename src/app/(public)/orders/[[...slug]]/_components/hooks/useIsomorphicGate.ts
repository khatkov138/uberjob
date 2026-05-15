'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQueryFeedContext, useStaticFeed } from '../providers/FeedController'; // 💡 Меняем импорт контекста на полный монолит
import { type FeedContext } from '../../page';

export type IsomorphicOrdersQueryKey = readonly ['orders', 'list', FeedContext];

export interface IsomorphicGateResult {
  queryKey: IsomorphicOrdersQueryKey;
  isServerKeyMatch: boolean;
  hasCachedData: boolean;
  serverDefaults: any;
}

let cachedServerDefaults: any = null;
let lastHash: string | null = null;

function parseServerHash(hash: string): any {
  if (hash === lastHash && cachedServerDefaults) {
    return cachedServerDefaults;
  }
  try {
    cachedServerDefaults = JSON.parse(hash);
    lastHash = hash;
    return cachedServerDefaults!;
  } catch (error) {
    console.error('❌ [ZWORK CRITICAL] Failed to parse initialServerHash:', error);
    return { radius: null, viewMode: 'list', categoryId: null, skillIds: [] };
  }
}

export function useIsomorphicGate(): IsomorphicGateResult {
  const { initialServerHash } = useStaticFeed(); // Оставляем для хэша

  // 💡 ГЛАВНЫЙ АРХИТЕКТУРНЫЙ СДВИГ: Берем полный собранный контекст со всей гео-датой!
  const fullContext = useQueryFeedContext();
  const queryClient = useQueryClient();

  // Извлекаем примитивы для стабильного массива зависимостей useMemo
  const clientRadius = fullContext.radius;
  const clientViewMode = fullContext.viewMode;
  const clientCategory = fullContext.categoryId ?? null;

  const clientSkillsStr = useMemo(() => {
    const skills = fullContext.skillIds;
    if (!skills) return '';
    return Array.isArray(skills) ? skills.sort().join(',') : String(skills);
  }, [fullContext.skillIds]);

  return useMemo(() => {
    const serverDefaults = parseServerHash(initialServerHash);
    const serverCategory = serverDefaults.categoryId ?? null;

    const serverSkillsStr = serverDefaults.skillIds
      ? (Array.isArray(serverDefaults.skillIds) ? serverDefaults.skillIds.sort().join(',') : String(serverDefaults.skillIds))
      : '';

    // Сверяем примитивы
    const isRadiusMatch = clientRadius === serverDefaults.radius;
    const isViewModeMatch = clientViewMode === serverDefaults.viewMode;
    const isCategoryMatch = clientCategory === serverCategory;
    const isSkillsMatch = clientSkillsStr === serverSkillsStr;

    const isServerKeyMatch = isRadiusMatch && isViewModeMatch && isCategoryMatch && isSkillsMatch;

    // Смешиваем серверные дефолты или отдаем полный контекст, где ГЕО-ЯДРО ТЕПЕРЬ СОХРАНЕНО ВСЕГДА!
    const stableContext: FeedContext = isServerKeyMatch
      ? { ...fullContext, ...serverDefaults }
      : fullContext; // <--- Теперь здесь гарантированно лежат lat, lng, locationId, name, slug

    const queryKey: IsomorphicOrdersQueryKey = ['orders', 'list', stableContext];
    const hasCachedData = !!queryClient.getQueryData(queryKey);

    return {
      queryKey,
      isServerKeyMatch,
      hasCachedData,
      serverDefaults
    };
  }, [initialServerHash, clientRadius, clientViewMode, clientCategory, clientSkillsStr, queryClient, fullContext]);
}
