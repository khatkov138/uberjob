'use client';

import React, { useMemo, useEffect, useRef, useState, Suspense, use } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

// Store & Hooks

import { useLocationStore } from '@/store/use-location-store';

// Actions & Utils
import { handleAction, unwrap } from '@/lib/utils';

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
import { getOrders, GetOrdersResponse } from '@/actions/order/get-feed';
import { FeedProvider } from './_components/layout/feed-context-provider';
import { OrderPreviewSheet } from './_components/shared/order-preview-sheet';
import { useOrdersFeedStore } from '@/store/use-orders-feed-store';
import { useFeedStatsStore } from '@/store/use-feed-stats';

interface OrdersPageUIProps {
  session: Session | null;
  initialProfile: FullProfile | null;
  feedContext: FeedContext;
  currentCategory: DBCategory | null;
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

  const [mounted, setMounted] = useState(false);

  // ЛОГ РЕНДЕРА РОДИТЕЛЯ
  console.log(`⚛️ [RENDER] OrdersPageUI (Mounted: ${mounted})`);


  // 1. Состояние гидратации стора локации (Core)
  const radius = useOrdersFeedStore(s => s.radius);
  const viewMode = useOrdersFeedStore(s => s.viewMode);
  const feedHydrated = useOrdersFeedStore(s => s._hasHydrated);

  const locHydrated = useLocationStore(s => s._hasHydrated);

  // 3. Общая готовность: клиент ожил + оба стора восстановили данные из кук
  const isReady = mounted && locHydrated && feedHydrated;

  useEffect(() => {
    setMounted(true);
    console.log("🟢 [MOUNT] OrdersPageUI mounted");
  }, []);

  // 2. ПРОФИЛЬ (Статичные данные юзера)
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
    console.log("🧩 [MEMO] Recalculating activeContext for:", 'isReady:' + isReady);

    // Если сторы еще не гидратированы, отдаем чистый серверный контекст
    if (!isReady) return feedContext;

    return {
      ...feedContext,
      // URL/Server — приоритет №1 для локации. 
      // Zustand синхронизируется провайдером позже.
      locationId: feedContext.locationId,

      // Остальные фильтры (радиус, режим) берем из Zustand
      radius: radius || feedContext.radius,
      viewMode: viewMode || feedContext.viewMode,
      skillIds: currentProfile?.skills?.map(s => s.categoryId) || feedContext.skillIds,
      categoryId: currentCategory?.id || null
    };
  }, [
    isReady,
    radius,
    viewMode,
    currentProfile?.skills,
    currentCategory?.id,
    feedContext
  ]);





  if (!mounted) return null;

  return (
    <FeedProvider value={activeContext}>
      <Container className="bg-white max-w-7xl pt-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <aside className="lg:col-span-3 space-y-12">
            <OrdersSidebarHeader />
            <Suspense fallback={<div className="h-40 bg-slate-50 animate-pulse rounded-3xl" />}>
              <OrdersSidebarDataWrapper promise={popularCategoriesPromise} />
            </Suspense>
          </aside>
          <section className="lg:col-span-9 space-y-8">
            {/* 1. Город виден МГНОВЕННО (т.к. вне Suspense) */}
            <OrdersPageHeader

              currentCategory={currentCategory} />

            <div className="flex flex-col shadow-2xl rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden relative">
              {/* 2. Тулбар тоже виден сразу */}
              <OrdersToolbar />

              {/* 3. Только лента заказов ждет промис */}
              <Suspense fallback={
                <div className="p-8 space-y-8">
                  <OrderCardSkeleton />
                  <OrderCardSkeleton />
                </div>
              }>
                <OrdersInitialHydrator
                  key={feedContext.locationId}
                  ordersPromise={ordersPromise}
                  activeContext={activeContext}
                  feedContext={feedContext}
                />
              </Suspense>
            </div>
          </section>

        </div>

        <OrderPreviewSheet />
        <LocationModal />
        <CategorySearchModal />
      </Container>
    </FeedProvider>
  );
}

let renderCount = 0;

export function OrdersInitialHydrator({
  ordersPromise,
  activeContext,
  feedContext,
}: {
  ordersPromise: Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;
  activeContext: FeedContext;
  feedContext: FeedContext;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["orders", activeContext.viewMode, activeContext];

  // 1. СИНХРОННЫЙ CHECK (Самая быстрая проверка)
  const hasData = !!queryClient.getQueryData(queryKey);

  console.log(`🔥 ВХОД В ГИДРАТОР: ${++renderCount} | HasData: ${hasData}`);

  // 2. ОПРЕДЕЛЯЕМ ТОЧКУ ВХОДА
  const isInitialState = React.useMemo(() => (
    activeContext.locationId === feedContext.locationId &&
    activeContext.radius === feedContext.radius &&
    activeContext.viewMode === feedContext.viewMode &&
    JSON.stringify(activeContext.skillIds?.sort()) === JSON.stringify(feedContext.skillIds?.sort())
  ), [activeContext, feedContext]);

  // 3. EARLY RETURN (Bypass)
  // Если мы уже не в начальном состоянии или данные уже в кэше — 
  // выходим НЕМЕДЛЕННО, не доходя до use()
  if (!isInitialState || hasData) {
    return <ViewRenderer viewMode={activeContext.viewMode} />;
  }

  // 4. SUSPENSE POINT
  // Компонент уснет здесь, если данных нет
  const result = use(ordersPromise);

  // 5. ПРАЙМИНГ КЭША
  // Сработает только один раз, когда промис разрешится
  const initialOrders = unwrap(result, { orders: [], nextCursor: null, total: 0 });

  if (activeContext.viewMode === 'list') {
    queryClient.setQueryData(queryKey, {
      pages: [initialOrders as GetOrdersResponse<'list'>],
      pageParams: [undefined]
    });
  } else {
    queryClient.setQueryData(queryKey, initialOrders as GetOrdersResponse<'map'>);
  }

  console.log(`💧 [HYDRATOR] Cache primed via use()`);

  // Статы здесь НЕ трогаем. Их подхватит OrdersFeed через свой useEffect.
  return <ViewRenderer viewMode={activeContext.viewMode} />;
}


function OrdersSidebarDataWrapper({ promise }: { promise: Promise<ActionResponse<PopularCategoryResult[]>> }) {
  const data = use(promise);
  const popularCategories = unwrap(data, []);
  return <OrdersSidebar popularCategories={popularCategories} />;
}
