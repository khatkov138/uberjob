import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveFeed, useStaticFeed } from '../providers/FeedController';

export interface FeedContext {
  radius: number | null;
  viewMode: 'list' | 'map' | string;
  categoryId: string | null;
  skillIds: string | null;
}

export interface IsomorphicGateResult {
  isServerKeyMatch: boolean;
  isFiltersChanged: boolean;
  hasCachedData: boolean;
  serverDefaults: FeedContext;
}

// Вынос кэша за пределы реактивного цикла для ленивого парсинга (Lazy Evaluation)
let cachedServerDefaults: FeedContext | null = null;
let lastHash: string | null = null;

function parseServerHash(hash: string): FeedContext {
  if (hash === lastHash && cachedServerDefaults) {
    return cachedServerDefaults;
  }
  try {
    cachedServerDefaults = JSON.parse(hash) as FeedContext;
    lastHash = hash;
    return cachedServerDefaults!;
  } catch (error) {
    console.error('❌ [ZWORK CRITICAL] Failed to parse initialServerHash:', error);
    return { radius: null, viewMode: 'list', categoryId: null, skillIds: '' };
  }
}

export function useIsomorphicGate(queryKey: readonly unknown[]): IsomorphicGateResult {
  const { initialServerHash } = useStaticFeed();
  const activeFilters = useActiveFeed();
  const queryClient = useQueryClient();

  return useMemo(() => {
    const serverDefaults = parseServerHash(initialServerHash);

    // Выравниваем пустые значения примитивов (Защита от расхождения "" vs null)
    const clientCategory = activeFilters.categoryId ?? null;
    const serverCategory = serverDefaults.categoryId ?? null;
    const clientSkills = activeFilters.skillIds || '';
    const serverSkills = serverDefaults.skillIds || '';

    // Строгий поатомарный затвор без implicit any
    const isRadiusMatch = activeFilters.radius === serverDefaults.radius;
    const isViewModeMatch = activeFilters.viewMode === serverDefaults.viewMode;
    const isCategoryMatch = clientCategory === serverCategory;
    const isSkillsMatch = clientSkills === serverSkills;

    const isServerKeyMatch = isRadiusMatch && isViewModeMatch && isCategoryMatch && isSkillsMatch;
    const hasCachedData = !!queryClient.getQueryData(queryKey);
    const isFiltersChanged = !hasCachedData && !isServerKeyMatch;

    return {
      isServerKeyMatch,
      isFiltersChanged,
      hasCachedData,
      serverDefaults
    };
  }, [initialServerHash, activeFilters, queryClient, queryKey]);
}
