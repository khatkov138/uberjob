import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveFeed, useStaticFeed } from '../providers/FeedController';
import { type FeedContext } from '../../page'; 

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

  // Извлекаем примитивы для стабильного массива зависимостей useMemo
  const clientRadius = activeFilters.radius;
  const clientViewMode = activeFilters.viewMode;
  const clientCategory = activeFilters.categoryId ?? null;
  const clientSkills = activeFilters.skillIds || '';

  return useMemo(() => {
    const serverDefaults = parseServerHash(initialServerHash);

    const serverCategory = serverDefaults.categoryId ?? null;
    const serverSkills = serverDefaults.skillIds || '';

    // Сверяем строго по вытащенным примитивам
    const isRadiusMatch = clientRadius === serverDefaults.radius;
    const isViewModeMatch = clientViewMode === serverDefaults.viewMode;
    const isCategoryMatch = clientCategory === serverCategory;
    const isSkillsMatch = clientSkills === serverSkills;

    const isServerKeyMatch = isRadiusMatch && isViewModeMatch && isCategoryMatch && isSkillsMatch;

    // Смешиваем серверные дефолты с полным контекстом страницы, сохраняя все скрытые поля (lat, lng)
    const stableContext: FeedContext = isServerKeyMatch
      ? { ...activeFilters, ...serverDefaults }
      : activeFilters;

    const queryKey: IsomorphicOrdersQueryKey = ['orders', 'list', stableContext];

    // Императивно проверяем кэш без подписки на ререндеринг queryClient
    const hasCachedData = !!queryClient.getQueryData(queryKey);

    // 🔥 МОНУМЕНТАЛЬНЫЙ ФИКС: Флаг измененных фильтров обязан быть равен true,
    // если текущие параметры клиента не совпадают со стартовыми параметрами SSR-сервера.
    const isFiltersChanged = !isServerKeyMatch;

    return {
      queryKey,
      isServerKeyMatch,
      isFiltersChanged,
      hasCachedData,
      serverDefaults
    };
  // Завязываем кэш useMemo строго на примитивы фильтров и хэш сервера. 
  // Объект queryClient и активный контекст больше не могут устроить ссылочный дребезг!
  }, [initialServerHash, clientRadius, clientViewMode, clientCategory, clientSkills, queryClient]);
}
