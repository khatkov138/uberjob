'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

// Store & Hooks
import { useOrdersStore } from '@/store/use-orders-store';
import { useLocationStore } from '@/store/use-location-store';

// Actions & Utils
import { handleAction } from '@/lib/utils';
import { FeedOrder, getOrders, GetOrdersResponse } from '@/actions/order/get';
import { FullProfile, getMyProfile } from '@/actions/profile/get';
import { DBCategory, PopularCategoryResult } from '@/actions/category/get';

// Components
import { Container } from '@/components/shared/container';
import { OrdersSidebar } from './_components/layout/orders-sidebar';
import { OrdersToolbar } from './_components/layout/orders-toolbar';
import { CategorySearchModal } from './_components/shared/category-search-modal';
import { LocationModal } from './_components/shared/location-modal';

// Изолированные компоненты (Observer-ы)
import { OrdersSidebarHeader } from './_components/layout/orders-sidebar-header';
import { OrdersPageHeader } from './_components/layout/orders-page-header';
import { ViewRenderer } from './_components/layout/view-renderer';

import { Session } from '@/lib/auth';
import { FeedContext } from './page';

interface OrdersPageUIProps {
  session: Session | null;
  // Указываем тип через 'list' | 'map', так как структура зависит от initialViewMode
  initialOrders: GetOrdersResponse<'list'> | GetOrdersResponse<'map'>;
  initialProfile: FullProfile | null;
  feedContext: FeedContext;
  popularCategories: PopularCategoryResult[];
  currentCategory: DBCategory | null;
  initialViewMode: 'list' | 'map';
}

export default function OrdersPageUI({
  session,
  initialOrders,
  initialProfile,
  feedContext,
  popularCategories,
  currentCategory,
  initialViewMode
}: OrdersPageUIProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const { globalLocationId, setGlobalLocation, _hasHydrated: locHydrated } = useLocationStore();
  const { radius, viewMode, _hasHydrated: ordersHydrated } = useOrdersStore();

  const isReady = mounted && locHydrated && ordersHydrated;

  useEffect(() => { setMounted(true); }, []);

  // 1. ПРОФИЛЬ (Строгий тип FullProfile)
  const { data: currentProfile } = useQuery<FullProfile | null>({
    queryKey: ["user-profile"],
    queryFn: () => handleAction(getMyProfile()),
    initialData: initialProfile,
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 30,
  });

  // 2. АКТИВНЫЙ КОНТЕКСТ
  const activeContext = useMemo((): FeedContext => {
    if (!isReady) return feedContext;
    const currentSkills = currentProfile?.skills?.map(s => s.categoryId) || feedContext.skillIds;

    return {
      ...feedContext,
      locationId: globalLocationId || feedContext.locationId,
      radius: radius || feedContext.radius,
      skillIds: currentSkills,
      categoryId: currentCategory?.id || null
    };
  }, [isReady, globalLocationId, radius, currentProfile, currentCategory, feedContext]);

  // 3. ШИНА ДАННЫХ
  useEffect(() => {
    if (!isReady) return;
    queryClient.setQueryData(['feed-context'], activeContext);
  }, [activeContext, queryClient, isReady]);

  const isInitialState = useMemo(() => {
    return (
      activeContext.locationId === feedContext.locationId &&
      activeContext.radius === feedContext.radius &&
      JSON.stringify(activeContext.skillIds.sort()) === JSON.stringify(feedContext.skillIds.sort())
    );
  }, [activeContext, feedContext]);

  // 4. INFINITE QUERY (mode: 'list')
  const infiniteQuery = useInfiniteQuery<GetOrdersResponse<'list'>>({
    queryKey: ["orders", "list", activeContext],
    queryFn: ({ pageParam }) =>
      handleAction(getOrders({
        ...activeContext,
        cursor: pageParam as string,
        mode: 'list', // Явно 'list'
      })),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: (isInitialState && initialViewMode === 'list') ? {
      pages: [initialOrders as GetOrdersResponse<'list'>], // Кастуем к list для гидратации
      pageParams: [undefined]
    } : undefined,
    enabled: isReady,
    staleTime: 1000 * 60 * 5,
  });

  // 5. MAP QUERY (mode: 'map')
  const mapQuery = useQuery<GetOrdersResponse<'map'>>({
    queryKey: ["orders", "map", activeContext],
    queryFn: () =>
      handleAction(getOrders({
        ...activeContext,
        mode: 'map' // Явно 'map'
      })),
    initialData: (isInitialState && initialViewMode === 'map')
      ? (initialOrders as GetOrdersResponse<'map'>)
      : undefined,
    enabled: isReady && (viewMode === 'map' || !isInitialState),
    staleTime: 1000 * 60 * 5,
  });

  // 6. СИНХРОНИЗАЦИЯ URL -> ZUSTAND
  const syncRef = useRef<string | null>(null);
  useEffect(() => {
    if (isReady && feedContext.locationId !== globalLocationId && syncRef.current !== feedContext.locationId) {
      setGlobalLocation(feedContext.locationId);
      syncRef.current = feedContext.locationId;
    }
  }, [isReady, feedContext.locationId, globalLocationId, setGlobalLocation]);

  if (!mounted) return null;

  return (
    <Container className="bg-white max-w-7xl pt-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        <aside className="lg:col-span-3 space-y-12">
          {/* Только этот заголовок в memo, так как isFetching меняется чаще всего */}
          <OrdersSidebarHeader />
          <OrdersSidebar popularCategories={popularCategories} />
        </aside>

        <section className="lg:col-span-9">
          <OrdersPageHeader currentCategory={currentCategory} />

          <div className="flex flex-col shadow-2xl shadow-slate-200/40 rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden relative">
            <OrdersToolbar />
            <ViewRenderer initialViewMode={initialViewMode} />
          </div>
        </section>
      </div>

      <LocationModal />
      <CategorySearchModal />
    </Container>
  );
}
