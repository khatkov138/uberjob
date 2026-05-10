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

import { OrderPreviewSheet } from './_components/shared/order-preview-sheet';

import { useFeedStatsStore } from '@/store/use-feed-stats';
import { useActiveFeed } from './_components/layout/FeedController';

interface OrdersPageUIProps {
  // Статика/Сессия (нужна только здесь для авторизации)
  session: Session | null;
  initialProfile: FullProfile | null;

  // Тяжелые промисы (Streaming)
  // Мы всё еще передаем их сверху, так как они созданы в page.tsx
  ordersPromise: Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;
  popularCategoriesPromise: Promise<ActionResponse<PopularCategoryResult[]>>;
}

export default function OrdersPageUI({
  session,
  initialProfile,
  ordersPromise,
  popularCategoriesPromise
}: OrdersPageUIProps) {
  // ⚛️ [RENDER] Теперь рендерится ОДИН РАЗ сразу на сервере и клиенте
  console.log(`⚛️ [RENDER] OrdersPageUI (Techno-minimalism)`);

 
  // 2. ПРОФИЛЬ (Оставляем как есть, TanStack Query отлично справляется)
  useQuery({
    queryKey: ["user-profile"],
    queryFn: () => handleAction(getMyProfile()),
    initialData: initialProfile,
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 30,
    notifyOnChangeProps: ['data'],
  });

  // 🧩 ВАЖНО: Больше никакого mounted, isReady и useMemo здесь!
  // Вся склейка данных (skillIds, radius и т.д.) теперь происходит 
  // в FeedController или внутри OrdersInitialHydrator, если это нужно.

  return (
    <Container className="bg-white max-w-7xl pt-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-3 space-y-12">
          <OrdersSidebarHeader />
          <Suspense fallback={<div className="h-40 bg-slate-50 animate-pulse rounded-3xl" />}>
            <OrdersSidebarDataWrapper promise={popularCategoriesPromise} />
          </Suspense>
        </aside>

        <section className="lg:col-span-9 space-y-8">
          {/* Город виден МГНОВЕННО */}
          <OrdersPageHeader />

          <div className="flex flex-col shadow-2xl rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden relative">
            {/* Тулбар виден сразу и синхронизирован со стором через контекст */}
            <OrdersToolbar />

            <Suspense fallback={
              <div className="p-8 space-y-8">
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </div>
            }>
              <OrdersInitialHydrator
               
                ordersPromise={ordersPromise}
              />
            </Suspense>
          </div>
        </section>
      </div>

      <OrderPreviewSheet />
      <LocationModal />
      <CategorySearchModal />
    </Container>
  );
}

let globalRenderCount = 0;

export function OrdersInitialHydrator({
  ordersPromise,
}: {
  ordersPromise: Promise<ActionResponse<GetOrdersResponse<'list'> | GetOrdersResponse<'map'>>>;
}) {
  const queryClient = useQueryClient();
  const activeContext = useActiveFeed();

  // 1. ФИКСАЦИЯ НАЧАЛЬНОЙ ТОЧКИ
  // Запоминаем контекст, который был ПРИ МАУНТЕ компонента (серверный).
  // useRef сохраняет это значение неизменным при ререндерах этого экземпляра.
  const initialContextRef = useRef(activeContext);

  const queryKey = ["orders", activeContext.viewMode, activeContext];
  const hasData = !!queryClient.getQueryData(queryKey);

  // 2. ОПРЕДЕЛЕНИЕ СМЕЩЕНИЯ
  // Если текущий активный контекст в шине не равен начальному — 
  // значит пользователь УЖЕ поменял фильтры (радиус, город и т.д.)
  const isContextShifted = initialContextRef.current !== activeContext;

  console.log(`🔥 [HYDRATOR] Render: ${++globalRenderCount} | HasData: ${hasData} | Shifted: ${isContextShifted}`);

  /**
   * ЭТО ГЛАВНЫЙ БАРЬЕР "БЕТОНА":
   * Мы выходим без вызова use(ordersPromise) в двух случаях:
   * 1. Данные уже в кэше (нормальный флоу навигации).
   * 2. Контекст изменился (пользователь покрутил радиус до того, как гидратор завершил работу).
   */
  if (hasData || isContextShifted) {
    return <ViewRenderer viewMode={activeContext.viewMode} />;
  }

  // 3. SUSPENSE POINT (React 19)
  // Вскрываем промис только для ПЕРВОГО набора данных.
  const result = use(ordersPromise);

  // 4. ПРАЙМИНГ КЭША (Silent Priming)
  const initialOrders = unwrap(result, { orders: [], nextCursor: null, total: 0 });

  if (activeContext.viewMode === 'list') {
    queryClient.setQueryData(queryKey, {
      pages: [initialOrders as GetOrdersResponse<'list'>],
      pageParams: [undefined]
    });
  } else {
    queryClient.setQueryData(queryKey, initialOrders as GetOrdersResponse<'map'>);
  }

  console.log(`💧 [HYDRATOR] Cache primed with server data`);

  return <ViewRenderer viewMode={activeContext.viewMode} />;
}

function OrdersSidebarDataWrapper({ promise }: { promise: Promise<ActionResponse<PopularCategoryResult[]>> }) {
  const data = use(promise);
  const popularCategories = unwrap(data, []);
  return <OrdersSidebar popularCategories={popularCategories} />;
}
