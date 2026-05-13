'use client';

import React, { Suspense } from 'react';

// Actions & Types
import { PopularCategoryResult } from '@/actions/category/get';
import { ActionResponse } from '@/lib/server-utils';
import { unwrap } from '@/lib/utils';

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
import { OrderPreviewSheet } from './_components/shared/order-preview-sheet';

// Контекст и Вочтер
import { useActiveFeed } from './_components/layout/FeedController';

interface OrdersPageUIProps {
  popularCategoriesPromise: Promise<ActionResponse<PopularCategoryResult[]>>;
}

export default function OrdersPageUI({
  popularCategoriesPromise
}: OrdersPageUIProps) {
  // ⚛️ [RENDER] Строго один проход — планировщик больше ничего не сбрасывает
  console.log(`⚛️ [RENDER] OrdersPageUI (Techno-minimalism)`);


  return (
    <Container className="bg-white max-w-7xl pt-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ЛЕВАЯ КОЛОНКА (Сайдбар категорий со своим стримом — прилетит мгновенно) */}
        <aside className="lg:col-span-3 space-y-12">
          <OrdersSidebarHeader />
          <Suspense fallback={<div className="h-40 bg-slate-50 animate-pulse rounded-3xl" />}>
            <OrdersSidebarDataWrapper promise={popularCategoriesPromise} />
          </Suspense>
        </aside>

        {/* ПРАВАЯ КОЛОНКА (Основной контентный блок) */}
        <section className="lg:col-span-9 space-y-8">
          {/* Хедер (Уже полностью независим, город виден мгновенно) */}

          <OrdersPageHeader />


          {/* 
    ОБЩАЯ СТИЛЬНАЯ ОБЕРТКА ФИДА И ТУЛБАРА.
    Она находится СНАРУЖИ саспенса, поэтому сама белая карточка 
    и Тулбар внутри нее отрендерятся на сервере за 0 секунд 
    и влетят в браузер при F5 моментально!
  */}
          <div className="flex flex-col shadow-2xl rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden relative">

            {/* 
      Тулбар виден СРАЗУ. Он полностью интерактивен, 
      так как зависит только от синхронного Zustand/Контекста 
    */}
            <OrdersToolbar />

            {/* 
      ИЗОЛИРОВАННЫЙ СУСПЕНС: Блокирует строго внутреннюю зону фида карточек/карты.
      Пока ordersPromise грузится, внутри белой карточки — под тулбаром — 
      будет крутиться аккуратная лента скелетонов, не ломая общую верстку!
    */}
            <Suspense fallback={
              <div className="p-8 space-y-8 border-t border-slate-50">
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </div>
            }>
              {/* 
        Нижняя часть фида (Список или Карта). 
        Она отрендерится и появится, как только промис зарезолвится.
      */}
              <ViewRendererWrapper />
            </Suspense>
          </div>
        </section>
      </div>

      {/* Служебные слои */}
      <OrderPreviewSheet />
      <LocationModal />
      <CategorySearchModal />
    </Container>
  );
}

function ViewRendererWrapper() {
  // Достаем контекст ТОЛЬКО там, где он реально влияет на отображение (смена list/map)
  const context = useActiveFeed();

  return (
    <ViewRenderer viewMode={context.viewMode} />
  );
}

/**
 * Изолированный оберточный компонент для нативного разворачивания категорий сайдбара в React 19
 */
function OrdersSidebarDataWrapper({ promise }: { promise: Promise<ActionResponse<PopularCategoryResult[]>> }) {
  const data = React.use(promise);
  const popularCategories = unwrap(data, []);
  return <OrdersSidebar popularCategories={popularCategories} />;
}
