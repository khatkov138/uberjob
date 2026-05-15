// src/features/orders/ui/OrdersPageUI.tsx
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
import { CategorySearchModal } from './_components/modals/category-search-modal';
import { LocationModal } from './_components/modals/location-modal';
import { OrderCardSkeleton } from './_components/shared/order-card-skeleton';

import { OrdersSidebarHeader } from './_components/layout/orders-sidebar-header';
import { ViewRenderer } from './_components/layout/view-renderer';
import { OrderPreviewSheet } from './_components/shared/order-preview-sheet';
import { useFeedStore } from './_components/providers/FeedProvider';
import { useShallow } from "zustand/shallow" // Импортируем компаратор
import { OrdersPageHeader } from './_components/layout/orders-page-header';

interface OrdersPageUIProps {
  popularCategoriesPromise: Promise<ActionResponse<PopularCategoryResult[]>>;
}

let uiRenderCount = 0;
let viewWrapperRenderCount = 0;
let sidebarWrapperRenderCount = 0;

export default function OrdersPageUI({
  popularCategoriesPromise
}: OrdersPageUIProps) {
  uiRenderCount++;

  // ⚛️ ГЛОБАЛЬНЫЙ МАКЕТ СТРАНИЦЫ
  console.log(`⚛️ [UI RENDER #${uiRenderCount}] OrdersPageUI (Основной каркас макета закоммичен)`);

  return (
    <Container className="bg-white max-w-7xl pt-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ЛЕВАЯ КОЛОНКА (Сайдбар категорий со своим стримом) */}
        <aside className="lg:col-span-3 space-y-12">
          <OrdersSidebarHeader />
          <Suspense fallback={<div className="h-40 bg-slate-50 animate-pulse rounded-3xl" />}>
            <OrdersSidebarDataWrapper promise={popularCategoriesPromise} />
          </Suspense>
        </aside>

        {/* ПРАВАЯ КОЛОНКА (Основной контентный блок) */}
        <section className="lg:col-span-9 space-y-8">
          <OrdersPageHeader />
          {/*orderspageheade*/}
          {/* ОБЩАЯ СТИЛЬНАЯ ОБЕРТКА ФИДА И ТУЛБАРА */}
          <div className="flex flex-col shadow-2xl rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden relative">

            {/* Тулбар виден сразу, управляет Zustand-стором */}
            <OrdersToolbar />

            {/* ИЗОЛИРОВАННЫЙ СУСПЕНС: Блокирует строго внутреннюю зону фида карточек/карты */}

            <ViewRendererWrapper />

          </div>
        </section>
      </div>

      {/* Служебные слои */}
      
      <LocationModal />
      <CategorySearchModal />
    </Container>
  );
}

/**
 * ИЗОЛИРОВАННЫЙ ДИСПЕТЧЕР РЕЖИМОВ ОТОБРАЖЕНИЯ (Список / Карта)
 */
function ViewRendererWrapper() {
  viewWrapperRenderCount++;

  // 🪄 Читаем строго атомарный примитив из Zustand с защитой от изменения ссылок.
  // Теперь этот компонент проснется ТОЛЬКО если юзер кликнет на вкладку "Карта" или "Список"!
  // Изменение радиуса поиска мастеров больше никогда не вызовет ререндер этой обертки.
  const viewMode = useFeedStore(useShallow((s) => s.viewMode));

  console.log(
    `🎛️ [VIEW WRAPPER RENDER #${viewWrapperRenderCount}] | ` +
    `Текущий режим: "${viewMode.toUpperCase()}"`
  );

  return (
    <ViewRenderer viewMode={viewMode} />
  );
}

/**
 * ИЗОЛИРОВАННЫЙ РАЗВЕРТЫВАТЕЛЬ СЕРВЕРНЫХ ПРОМИСОВ ДЛЯ САЙДБАРА (React 19 Concurrent Streaming)
 */
function OrdersSidebarDataWrapper({ promise }: { promise: Promise<ActionResponse<PopularCategoryResult[]>> }) {
  sidebarWrapperRenderCount++;

  // console.log(`🧬 [SIDEBAR WRAPPER #${sidebarWrapperRenderCount}] Вход в затвор Саспенса сайдбара. Опрашиваем промис...`);

  // Нативно разворачиваем серверный стрим базы данных без блокировки гидратации основного макета
  const data = React.use(promise);

  //console.log(`✨ [SIDEBAR STREAM RESOLVED #${sidebarWrapperRenderCount}] Промис сайдбара успешно пройден! Данные влиты в DOM.`);

  const popularCategories = unwrap(data, []);
  return <OrdersSidebar popularCategories={popularCategories} />;
}
