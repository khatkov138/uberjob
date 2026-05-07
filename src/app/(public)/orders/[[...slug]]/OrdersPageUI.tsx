'use client';

import { useMemo, useEffect, useRef, useState, Suspense, use } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

// Store & Hooks
import { useOrdersStore } from '@/store/use-orders-store';
import { useLocationStore } from '@/store/use-location-store';

// Actions & Utils
import { handleAction, unwrap } from '@/lib/utils';
import { getOrders, GetOrdersResponse } from '@/actions/order/get';
import { FullProfile, getMyProfile } from '@/actions/profile/get';
import { DBCategory, PopularCategoryResult } from '@/actions/category/get';

// Components
import { Container } from '@/components/shared/container';
import { OrdersSidebar } from './_components/layout/orders-sidebar';
import { OrdersToolbar } from './_components/layout/orders-toolbar';
import { CategorySearchModal } from './_components/shared/category-search-modal';
import { LocationModal } from './_components/shared/location-modal';
import { OrderCardSkeleton } from './_components/shared/order-card-skeleton';

import { OrdersSidebarHeader } from './_components/layout/orders-sidebar-header';
import { OrdersPageHeader } from './_components/layout/orders-page-header';
import { ViewRenderer } from './_components/layout/view-renderer';

import { Session } from '@/lib/auth';
import { FeedContext } from './page';
import { ActionResponse } from '@/lib/server-utils';

interface OrdersPageUIProps {
  session: Session | null;
  initialProfile: FullProfile | null;
  feedContext: FeedContext;
  currentCategory: DBCategory | null;
  // Строгая типизация промисов без any
  ordersPromise: Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;
  popularCategoriesPromise: Promise<ActionResponse<PopularCategoryResult[]>>;
}

export default function OrdersPageUI({
  session,
  initialProfile,
  feedContext,
  currentCategory,
  ordersPromise,
  popularCategoriesPromise
}: OrdersPageUIProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // 1. АТОМАРНЫЕ СЕЛЕКТОРЫ
  const globalLocationId = useLocationStore(s => s.globalLocationId);
  const setGlobalLocation = useLocationStore(s => s.setGlobalLocation);
  const locHydrated = useLocationStore(s => s._hasHydrated);

  const radius = useOrdersStore(s => s.radius);
  const viewMode = useOrdersStore(s => s.viewMode);
  const ordersHydrated = useOrdersStore(s => s._hasHydrated);

  const isReady = mounted && locHydrated && ordersHydrated;

  useEffect(() => { setMounted(true); }, []);

  // 2. ПРОФИЛЬ
  const { data: currentProfile } = useQuery<FullProfile | null>({
    queryKey: ["user-profile"],
    queryFn: () => handleAction(getMyProfile()),
    initialData: initialProfile,
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 30,
    notifyOnChangeProps: ['data'],
  });

  // 3. АКТИВНЫЙ КОНТЕКСТ
  const activeContext = useMemo((): FeedContext => {
    if (!isReady) return feedContext;
    const currentSkills = currentProfile?.skills?.map(s => s.categoryId) || feedContext.skillIds;
    return {
      ...feedContext,
      locationId: globalLocationId || feedContext.locationId,
      radius: radius || feedContext.radius,
      viewMode: viewMode || feedContext.viewMode,
      skillIds: currentSkills,
      categoryId: currentCategory?.id || null
    };
  }, [isReady, globalLocationId, radius, viewMode, currentProfile, currentCategory, feedContext]);

  // 4. ШИНА ДАННЫХ
  useEffect(() => {
    if (!isReady) return;
    queryClient.setQueryData(['feed-context'], activeContext);
  }, [JSON.stringify(activeContext), isReady, queryClient]);

  // 5. СИНХРОНИЗАЦИЯ URL -> ZUSTAND
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
          <OrdersSidebarHeader />
          <Suspense fallback={<div className="h-40 bg-slate-50 animate-pulse rounded-3xl" />}>
            <OrdersSidebarDataWrapper promise={popularCategoriesPromise} />
          </Suspense>
        </aside>

        <section className="lg:col-span-9">
          <OrdersPageHeader currentCategory={currentCategory} />

          <div className="flex flex-col shadow-2xl shadow-slate-200/40 rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden relative">
            <OrdersToolbar />

            <Suspense fallback={
              <div className="p-8 space-y-8">
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </div>
            }>
              <OrdersInitialHydrator
                ordersPromise={ordersPromise}
                activeContext={activeContext}
                feedContext={feedContext}
              />
            </Suspense>
          </div>
        </section>
      </div>

      <LocationModal />
      <CategorySearchModal />
    </Container>
  );
}

/**
 * ГИДРАТОР ЗАКАЗОВ 
 */
function OrdersInitialHydrator({
  ordersPromise,
  activeContext,
  feedContext
}: {
  ordersPromise: Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;
  activeContext: FeedContext;
  feedContext: FeedContext;
}) {

  // Распаковка промиса (React 19)
  const resolvedOrders = use(ordersPromise);

  // Типизированная распаковка. Мы знаем, что сервер прислал данные согласно feedContext.viewMode
  const initialOrders = unwrap(resolvedOrders, { orders: [], nextCursor: null, total: 0 });

  const isInitialState = (
    activeContext.locationId === feedContext.locationId &&
    activeContext.radius === feedContext.radius &&
    activeContext.viewMode === feedContext.viewMode
  );

  // Регистрируем Infinite Query в кэше
  useInfiniteQuery<GetOrdersResponse<'list'>>({
    queryKey: ["orders", "list", activeContext],
    queryFn: ({ pageParam }) => handleAction(getOrders({ ...activeContext, cursor: pageParam as string, mode: 'list' })),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: (isInitialState && activeContext.viewMode === 'list') ? {
      pages: [initialOrders as GetOrdersResponse<'list'>],
      pageParams: [undefined]
    } : undefined,
    enabled: activeContext.viewMode === 'list',
    staleTime: 1000 * 60 * 5,
  });

  // Регистрируем Map Query в кэше
  useQuery<GetOrdersResponse<'map'>>({
    queryKey: ["orders", "map", activeContext],
    queryFn: () => handleAction(getOrders({ ...activeContext, mode: 'map' })),
    initialData: (isInitialState && activeContext.viewMode === 'map')
      ? (initialOrders as GetOrdersResponse<'map'>)
      : undefined,
    enabled: activeContext.viewMode === 'map',
    staleTime: 1000 * 60 * 5,
  });

  return <ViewRenderer viewMode={activeContext.viewMode} />;
}

/**
 * ГИДРАТОР САЙДБАРА 
 */
function OrdersSidebarDataWrapper({
  promise
}: {
  promise: Promise<ActionResponse<PopularCategoryResult[]>>
}) {
  const data = use(promise);
  const popularCategories = unwrap(data, []);
  return <OrdersSidebar popularCategories={popularCategories} />;
}
