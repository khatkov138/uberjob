import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveFeed, useStaticFeed } from '../providers/FeedController';
import { type FeedContext } from '../../page'; // 🎯 Единственная точка импорта оригинального контекста

export type IsomorphicOrdersQueryKey = readonly ['orders', 'list', FeedContext];

export interface IsomorphicGateResult {
  queryKey: IsomorphicOrdersQueryKey;
  isServerKeyMatch: boolean;
  isFiltersChanged: boolean;
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
    return { radius: null, viewMode: 'list', categoryId: null, skillIds: '' };
  }
}

export function useIsomorphicGate(): IsomorphicGateResult {
  const { initialServerHash } = useStaticFeed();
  const activeFilters = useActiveFeed() as FeedContext;
  const queryClient = useQueryClient();

  return useMemo(() => {
    const serverDefaults = parseServerHash(initialServerHash);

    const clientCategory = activeFilters.categoryId ?? null;
    const serverCategory = serverDefaults.categoryId ?? null;
    const clientSkills = activeFilters.skillIds || '';
    const serverSkills = serverDefaults.skillIds || '';

    const isRadiusMatch = activeFilters.radius === serverDefaults.radius;
    const isViewModeMatch = activeFilters.viewMode === serverDefaults.viewMode;
    const isCategoryMatch = clientCategory === serverCategory;
    const isSkillsMatch = clientSkills === serverSkills;

    const isServerKeyMatch = isRadiusMatch && isViewModeMatch && isCategoryMatch && isSkillsMatch;

    // Смешиваем серверные дефолты с полным контекстом страницы, сохраняя все скрытые поля (lat, lng)
    const stableContext: FeedContext = isServerKeyMatch
      ? { ...activeFilters, ...serverDefaults }
      : activeFilters;

    const queryKey: IsomorphicOrdersQueryKey = ['orders', 'list', stableContext];

    const hasCachedData = !!queryClient.getQueryData(queryKey);
    const isFiltersChanged = !hasCachedData && !isServerKeyMatch;

    return {
      queryKey,
      isServerKeyMatch,
      isFiltersChanged,
      hasCachedData,
      serverDefaults
    };
  }, [initialServerHash, activeFilters, queryClient]);
}
