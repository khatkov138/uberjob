'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Store & Hooks
import { useOrdersStore } from '@/store/use-orders-store';
import { useLocationStore } from '@/store/use-location-store';
import { useUserSkills } from '@/hooks/use-user-skills';

// Actions & Utils
import { handleAction, cn } from '@/lib/utils';
import { FeedOrder, getOrders } from '@/actions/order/get';
import { FullProfile, getMyProfile } from '@/actions/profile/get';
import { DBCategory, PopularCategoryResult } from '@/actions/category/get';

// Components
import { Container } from '@/components/shared/container';
import { OrdersSidebar } from './_components/layout/orders-sidebar';
import { OrdersToolbar } from './_components/layout/orders-toolbar';
import { FetchingRadar } from './_components/shared/fetching-radar';
import { OrdersFeed } from './_components/feed/orders-feed';
import { MapViewport } from './_components/map/map-viewport';
import { CategorySearchModal } from './_components/shared/category-search-modal';
import { LocationModal } from './_components/shared/location-modal';

import { Session } from '@/lib/auth';
import { FeedContext } from './page';

interface OrdersPageUIProps {
  session: Session | null;
  initialOrders: FeedOrder[];
  initialProfile: FullProfile | null;
  feedContext: FeedContext;
  popularCategories: PopularCategoryResult[];
  currentCategory: DBCategory | null;
}

export default function OrdersPageUI({
  session,
  initialOrders,
  initialProfile,
  feedContext,
  popularCategories,
  currentCategory
}: OrdersPageUIProps) {
  const queryClient = useQueryClient();

  // 0. Флаг монтажа для безопасной гидратации UI
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 1. STORES
  const { globalLocationId, setGlobalLocation, _hasHydrated: locHydrated } = useLocationStore();
  const { viewMode, radius, _hasHydrated: ordersHydrated } = useOrdersStore();
  const isReady = locHydrated && ordersHydrated;

  // 2. ПРОФИЛЬ (Прямое чтение из кеша для стабильности activeContext)
  const { data: currentProfile } = useQuery<FullProfile | null>({
    queryKey: ["user-profile"],
    queryFn: () => handleAction(getMyProfile()),
    initialData: initialProfile,
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 30,
  });

  // 3. ФОРМИРОВАНИЕ АКТИВНОГО КОНТЕКСТА (Single Source of Truth)
  const stableSkillIds = useMemo(() => {
    if (!mounted || !currentProfile) return feedContext.skillIds;
    return currentProfile.skills.map(s => s.categoryId);
    // Используем JSON.stringify для глубокого сравнения, чтобы массив пересоздавался 
    // только когда реально изменился состав скиллов
  }, [mounted, currentProfile?.skills, feedContext.skillIds]);

  // 2. Формируем контекст
  const activeContext = useMemo((): FeedContext => {
    // Теперь используем уже стабильный stableSkillIds
    const currentRadius = isReady ? radius : feedContext.radius;
    const currentLocationId = isReady ? (globalLocationId || feedContext.locationId) : feedContext.locationId;

    return {
      ...feedContext,
      locationId: currentLocationId,
      radius: currentRadius,
      skillIds: stableSkillIds,
      categoryId: currentCategory?.id || null
    };
  }, [feedContext, isReady, radius, globalLocationId, stableSkillIds, currentCategory]);
  
  // 4. ШИНА ДАННЫХ (Observer Bus)
  useQuery<FeedContext>({
    queryKey: ['feed-context'],
    queryFn: () => undefined as any,
    initialData: activeContext,
    staleTime: Infinity,
  });

  useEffect(() => {
    queryClient.setQueryData(['feed-context'], activeContext);
  }, [activeContext, queryClient]);

  // 5. ОСНОВНОЙ ЗАПРОС ЛЕНТЫ
  const isInitialState = useMemo(() => {
    return (
      activeContext.locationId === feedContext.locationId &&
      activeContext.radius === feedContext.radius &&
      JSON.stringify(activeContext.skillIds) === JSON.stringify(feedContext.skillIds)
    );
  }, [activeContext, feedContext]);

  const { data: orders = [], isFetching } = useQuery<FeedOrder[]>({
    queryKey: ["orders", activeContext],
    queryFn: () => handleAction(getOrders({ ...activeContext, limit: 15 })),
    initialData: isInitialState ? initialOrders : undefined,
    staleTime: 1000 * 60 * 5,
  });

  // 6. UI HELPERS
  const { hasSkills } = useUserSkills(); // Используем для текстовых подписей
  const safeIsFetching = mounted && isFetching;
  const displayOrdersCount = mounted ? orders.length : initialOrders.length;

  // 7. СИНХРОНИЗАЦИЯ URL -> ZUSTAND
  const syncRef = useRef<string | null>(null);
  useEffect(() => {
    if (isReady && feedContext.locationId !== globalLocationId && syncRef.current !== feedContext.locationId) {
      setGlobalLocation(feedContext.locationId);
      syncRef.current = feedContext.locationId;
    }
  }, [isReady, feedContext.locationId, globalLocationId, setGlobalLocation]);

  return (
    <Container className="bg-white max-w-7xl pt-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* SIDEBAR */}
        <aside className="lg:col-span-3 space-y-12">
          <header className="px-2 space-y-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
              Поиск <br /> <span className="text-blue-600">заказов</span>
            </h1>
            <div className="flex items-center gap-2 opacity-40">
              <div className={cn(
                "w-1 h-1 rounded-full bg-blue-600",
                safeIsFetching ? "animate-ping" : "animate-pulse"
              )} />
              <span className="text-[8px] font-black uppercase tracking-[0.3em]">
                {safeIsFetching ? "Обновление..." : "Live Feed"}
              </span>
            </div>
          </header>
          <OrdersSidebar popularCategories={popularCategories} />
        </aside>

        {/* FEED AREA */}
        <section className="lg:col-span-9">
          <div className="px-2 pt-4 pb-8 space-y-4">
            <div className="flex items-baseline gap-4 flex-wrap">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                {currentCategory ? (
                  <>{currentCategory.name} <span className="text-blue-600 ml-2 whitespace-nowrap">в {feedContext.name}</span></>
                ) : (
                  <>Заказы <span className="text-blue-600 ml-2 whitespace-nowrap">в {feedContext.name}</span></>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-black italic text-slate-100">/</span>
                <span className="text-5xl font-black italic text-slate-900 tracking-tighter">
                  {safeIsFetching && orders.length === 0 ? "..." : displayOrdersCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100 text-emerald-600">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span>Найдено: {displayOrdersCount}</span>
              </div>
              <span className="ml-2">
                {!currentCategory && hasSkills ? "Ваши ниши" : "Все категории"}
                • {activeContext.radius}км
              </span>
            </div>
          </div>

          <div className="flex flex-col shadow-2xl shadow-slate-200/40 rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden relative">
            <OrdersToolbar />

            <div className={cn(
              "relative min-h-[700px] transition-all duration-500",
              viewMode === "list" ? "bg-white" : "bg-slate-50"
            )}>
              <FetchingRadar isVisible={safeIsFetching} />

              <div className={cn(
                "h-full transition-all duration-500",
                safeIsFetching && orders.length === 0 && "blur-md opacity-40 scale-[0.99]"
              )}>
                {viewMode === "list" ? (
                  <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2">
                    <OrdersFeed />
                  </div>
                ) : (
                  <div className="h-[750px] w-full relative">
                    <MapViewport />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <LocationModal />
      <CategorySearchModal />
    </Container>
  );
}
