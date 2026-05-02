"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"

// Store & Libs
import { useLocationStore } from "@/store/use-location-store"
import { roundCoord } from "@/lib/location-config"
import { handleAction, cn } from "@/lib/utils"

// Actions
import { getOrders, type FeedOrder } from "@/actions/order/get"
import { getMyProfile, type FullProfile } from "@/actions/profile/get"
import { addSkill, removeSkill } from "@/actions/profile/manage"

// Layout Components
import { Container } from "@/components/shared/container"
import { OrdersSidebar } from "./_components/layout/orders-sidebar"
import { OrdersToolbar } from "./_components/layout/orders-toolbar"
import { OrdersFeed } from "./_components/feed/orders-feed"
import { MapViewport } from "./_components/map/map-viewport"

// Shared Components
import { FetchingRadar } from "./_components/shared/fetching-radar"
import { LoadingState } from "./_components/shared/loading-state"
import { CategorySearchModal } from "./_components/shared/category-search-modal"
import { LocationModal } from "./_components/shared/location-modal"
import { Session } from "@/lib/auth"
import { DBCategory } from "@/actions/category/get"

interface OrdersPageClientProps {
  session: Session | null
  initialOrders: FeedOrder[]
  initialProfile: FullProfile | null
  serverLocation: {
    city: string
    lat: number
    lng: number
    radius: number,
    slug: string
  }
}

export default function OrdersPageClient({
  session,
  initialOrders,
  initialProfile,
  serverLocation
}: OrdersPageClientProps) {
  const queryClient = useQueryClient()

  // Явно указываем тип для режима отображения
  const [viewMode, setViewMode] = React.useState<"list" | "map">("list")
  const [isCatModalOpen, setIsCatModalOpen] = React.useState(false)

  const { lat, lng, radius, city, _hasHydrated, setLocation, } = useLocationStore()

  React.useEffect(() => {
    if (_hasHydrated && serverLocation.city !== city) {
      // serverLocation.slug ОБЯЗАТЕЛЬНО должен тут быть
      setLocation(
        serverLocation.city,
        serverLocation.lat,
        serverLocation.lng,
        serverLocation.slug
      );
    }
  }, [_hasHydrated, serverLocation, city, setLocation]);

  // --- ГЕО ПАРАМЕТРЫ ---
  const currentLat = roundCoord(_hasHydrated ? lat : serverLocation.lat)
  const currentLng = roundCoord(_hasHydrated ? lng : serverLocation.lng)
  const currentRadius = _hasHydrated ? radius : serverLocation.radius

  const isServerKey = currentLat === roundCoord(serverLocation.lat) &&
    currentLng === roundCoord(serverLocation.lng) &&
    currentRadius === serverLocation.radius

  // --- QUERIES ---
  // Типизируем useQuery как массив FeedOrder
  const { data: orders = [], isFetching: isOrdersFetching, isPending: isInitialLoading } = useQuery<FeedOrder[]>({
    queryKey: ["orders", currentLat, currentLng, currentRadius, session?.user?.id],
    queryFn: async () => handleAction(getOrders({ lat: currentLat, lng: currentLng, radius: currentRadius })),
    initialData: isServerKey ? initialOrders : undefined,
    placeholderData: keepPreviousData,
  })

  const profileKey = ["user-profile", session?.user?.id]

  const { data: profile } = useQuery<FullProfile | null>({
    queryKey: profileKey,
    queryFn: () => handleAction(getMyProfile()),
    initialData: initialProfile ?? undefined,
    enabled: !!session?.user?.id
  })


  // --- MUTATIONS ---
  // Типизируем входные параметры мутации
  const { mutate: handleToggleSkill } = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'add' | 'remove' }) => {
      return action === 'add' ? handleAction(addSkill(id)) : handleAction(removeSkill(id))
    },

    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: profileKey })
      const previousProfile = queryClient.getQueryData<FullProfile>(profileKey)

      if (previousProfile) {
        // 1. Ищем категорию в кеше всех категорий (массив DBCategory)
        const allCategories = queryClient.getQueryData<DBCategory[]>(['all-categories'])
        const categoryName = allCategories?.find(cat => cat.id === id)?.name ?? '...'

        // 2. Формируем новый скилл строго по твоей структуре
        const newSkill = {
          profileId: previousProfile.id, // profileId берем из текущего профиля
          categoryId: id,
          category: {
            id: id,
            name: categoryName
          }
        }

        // 3. Обновляем кеш
        queryClient.setQueryData<FullProfile>(profileKey, {
          ...previousProfile,
          skills: action === 'add'
            ? [...previousProfile.skills, newSkill]
            : previousProfile.skills.filter((s) => s.categoryId !== id)
        })
      }

      return { previousProfile }
    },

    onError: (err, variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKey, context.previousProfile)
      }
    },
    // onSuccess пустой, чтобы не было лишних GET-запросов (инвалидации)
  })

  // Теперь stats типизированы автоматически через вывод типов
  const mySkillIds = React.useMemo(() =>
    new Set(profile?.skills.map((s) => s.categoryId) || []),
    [profile]
  )

  const stats = React.useMemo(() => {
    const activeOrders = _hasHydrated ? orders : initialOrders
    return {
      total: activeOrders.length,
      matched: activeOrders.filter((o) =>
        o.categories.some((c) => mySkillIds.has(c.categoryId))
      ).length
    }
  }, [orders, initialOrders, mySkillIds, _hasHydrated])
  if (isInitialLoading && !initialOrders.length) return <LoadingState />

  return (
    <Container className="bg-white max-w-7xl pt-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ЛЕВАЯ КОЛОНКА (3/12) */}
        <aside className="lg:col-span-3 space-y-12">
          <header className="px-2 space-y-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
              Поиск <br /> <span className="text-blue-600">заказов</span>
            </h1>
            <div className="flex items-center gap-2 opacity-40">
              <div className={cn("w-1 h-1 rounded-full bg-blue-600", isOrdersFetching ? "animate-ping" : "animate-pulse")} />
              <span className="text-[8px] font-black uppercase tracking-[0.3em]">Live Feed</span>
            </div>
          </header>

          <OrdersSidebar
            userId={session?.user?.id}
            onAddClick={() => setIsCatModalOpen(true)}
            onRemoveSkill={(id) => handleToggleSkill({ id, action: 'remove' })}
            isFetching={isOrdersFetching}
            // Передаем данные для Пульса
            citySlug={serverLocation.slug}
            cityName={serverLocation.city}
          />
        </aside>

        {/* ПРАВАЯ КОЛОНКА (9/12) */}
        <section className="lg:col-span-9 space-y-8">

          {/* SEO ЗАГОЛОВОК + СЧЕТЧИК */}
          <div className="px-2 pt-4 space-y-4 transition-all">
            <div className="flex items-baseline gap-4 flex-wrap">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                Заказы <span className="text-blue-600 ml-2 whitespace-nowrap">в {serverLocation.city}</span>
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-black italic text-slate-100">/</span>
                <span className="text-5xl font-black italic text-slate-900 tracking-tighter animate-in fade-in zoom-in duration-500">
                  {mySkillIds.size > 0 ? stats.matched : stats.total}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">
                  всего в локации: {stats.total}
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase italic tracking-wide flex items-center gap-2">
                <span>{mySkillIds.size > 0 ? `Отфильтровано по ${mySkillIds.size} категориям` : "Все категории"}</span>
                <span className="opacity-20">|</span>
                <span>Радиус {radius}км</span>
              </div>
            </div>
          </div>

          {/* ТУЛБАР */}
          <div className="sticky top-6 z-30">
            <OrdersToolbar
              viewMode={viewMode}
              setViewMode={setViewMode}
              city={serverLocation.city}
              serverRadius={serverLocation.radius}
            />
          </div>

          {/* ГЛАВНЫЙ КОНТЕЙНЕР КОНТЕНТА */}
          <div className={cn(
            "relative min-h-[700px] rounded-[3.5rem] transition-all duration-500",
            /* 
               ЛОГИКА СЛОЕВ:
               1. В режиме КАРТЫ: оставляем рамку (border) и фон, чтобы карта была в "раме".
               2. В режиме СПИСКА: убираем рамку (border-transparent) и оставляем только 
                  мягкий фон (bg-slate-50). Теперь белые карточки со своими рамками будут 
                  единственным графическим акцентом.
            */
            viewMode === "list"
              ? "bg-slate-50/50 border-transparent shadow-none"
              : "bg-slate-50 border border-slate-100 shadow-2xl shadow-slate-200/40"
          )}>

            {/* Радар теперь летает поверх всего без ограничений */}
            <FetchingRadar isVisible={isOrdersFetching} />

            <div className={cn("h-full transition-all duration-500", isOrdersFetching && "blur-sm opacity-50")}>
              {viewMode === "list" ? (
                /* 
                   Для списка добавляем p-4 или p-6. 
                   Это создаст "воздушный зазор" между краем подложки и карточкой.
                   Белая карточка на светло-сером фоне (slate-50) будет выглядеть объемно.
                */
                <div className="p-4 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <OrdersFeed
                    orders={orders}
                    mySkillIds={mySkillIds}
                    isFetching={isOrdersFetching}
                  />
                </div>
              ) : (
                /* КАРТА: остается как была — в край (overflow-hidden нужен только здесь) */
                <div className="h-[700px] w-full rounded-[3.5rem] overflow-hidden animate-in fade-in duration-500">
                  <MapViewport
                    orders={orders}
                    center={[currentLat, currentLng]}
                    radius={radius}
                    mySkillIds={mySkillIds}
                    isFetching={isOrdersFetching}
                  />
                </div>
              )}
            </div>
          </div>

        </section>
      </div>
      <LocationModal />
      <CategorySearchModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        userCategoryIds={Array.from(mySkillIds)}
        onAdd={(id: string) => handleToggleSkill({ id, action: 'add' })}
        onRemove={(id: string) => handleToggleSkill({ id, action: 'remove' })}
      />
    </Container>
  )
}
