'use client';

import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

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
import { FeedContext } from './page';
import { Session } from '@/lib/auth';


interface OrdersPageClientProps {
  session: Session | null;
  initialOrders: FeedOrder[];
  initialProfile: FullProfile | null;
  feedContext: FeedContext;
  popularCategories: PopularCategoryResult[];
  currentCategory: DBCategory | null;
}

export default function OrdersPageClient({
  session,
  initialOrders,
  initialProfile,
  feedContext,
  popularCategories,
  currentCategory
}: OrdersPageClientProps) {

  // 1. STORES
  const { globalLocationId, setGlobalLocation, _hasHydrated } = useLocationStore();
  const { viewMode, radius } = useOrdersStore();

  // 2. ПАССИВНЫЙ КЕШ ЛОКАЦИИ (Для Toolbar/Sidebar/Map)
  useQuery<FeedContext>({
    queryKey: ['current-location'],
    queryFn: () => { throw new Error("Cache sync only") },
    initialData: feedContext,
    staleTime: Infinity,
    enabled: false,
  });

  // 3. ГИДРАТАЦИЯ ПРОФИЛЯ (Для useUserSkills)
  useQuery<FullProfile | null>({
    queryKey: ["user-profile"],
    queryFn: () => handleAction(getMyProfile()),
    initialData: initialProfile,
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false
  });

  // 4. СИНХРОНИЗАЦИЯ URL -> STORE
  useEffect(() => {
    if (_hasHydrated && feedContext.id !== globalLocationId) {
      setGlobalLocation(feedContext.id);
    }
  }, [_hasHydrated, feedContext.id, globalLocationId, setGlobalLocation]);

  // 5. ОСНОВНОЙ ЗАПРОС ЛЕНТЫ
  const activeParams = useMemo(() => ({
    ...feedContext,
    radius: radius, // Актуальный радиус из Zustand
    categoryId: currentCategory?.id || null
  }), [feedContext, radius, currentCategory]);

  const { data: orders = [], isFetching } = useQuery({
    queryKey: ["orders", activeParams],
    queryFn: () => handleAction(getOrders({ ...activeParams, limit: 15 })),
    // Важно: подхватываем SSR данные только если радиус в сторе совпал с серверным
    initialData: radius === feedContext.radius ? initialOrders : undefined,
    staleTime: 1000 * 60 * 5,
  });

  // 6. СТАТИСТИКА (Через наш хук)
  const { skillIds, hasSkills } = useUserSkills();

  const stats = useMemo(() => {
    const total = orders.length;
    const matched = orders.filter(o =>
      o.categories.some(c => skillIds.has(c.categoryId))
    ).length;

    return { total, matched, hasSkills };
  }, [orders, skillIds, hasSkills]);

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
              <div className={cn("w-1 h-1 rounded-full bg-blue-600", isFetching ? "animate-ping" : "animate-pulse")} />
              <span className="text-[8px] font-black uppercase tracking-[0.3em]">Live Feed</span>
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
                  {hasSkills ? stats.matched : stats.total}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100 text-emerald-600">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span>всего рядом: {stats.total}</span>
              </div>
              <span className="ml-2">
                {hasSkills ? `Подходит вам: ${stats.matched}` : "Все категории"}
                • {radius}км
              </span>
            </div>
          </div>

          {/* MONOLITH CONTAINER */}
          <div className="flex flex-col shadow-2xl shadow-slate-200/40 rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden relative">
            <OrdersToolbar />

            <div className={cn(
              "relative min-h-[700px] transition-all duration-500",
              viewMode === "list" ? "bg-white" : "bg-slate-50"
            )}>
              {/* РАДАР ЗАГРУЗКИ */}
              <FetchingRadar isVisible={isFetching} />

              <div className={cn("h-full transition-all duration-500", isFetching && "blur-md opacity-40 scale-[0.99]")}>
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
