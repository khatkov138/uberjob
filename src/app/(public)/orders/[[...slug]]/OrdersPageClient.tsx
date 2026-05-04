"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { DBCategory, getAllCategories, PopularCategoryResult } from "@/actions/category/get"
import { InferActionResult } from "@/lib/types/types"
import { Session } from "@/lib/auth"
import { FeedOrder, getOrders } from "@/actions/order/get"
import { FullProfile, getMyProfile } from "@/actions/profile/get"
import { cn, handleAction } from "@/lib/utils"
import { addSkill, removeSkill } from "@/actions/profile/manage"

import { Container } from "@/components/shared/container"
import { OrdersSidebar } from "./_components/layout/orders-sidebar"
import { FetchingRadar } from "./_components/shared/fetching-radar"
import { OrdersFeed } from "./_components/feed/orders-feed"
import { MapViewport } from "./_components/map/map-viewport"
import { LocationModal } from "./_components/shared/location-modal"
import { CategorySearchModal } from "./_components/shared/category-search-modal"
import { OrdersToolbar } from "./_components/layout/orders-toolbar"
import { useLocationStore } from "@/store/use-location-store"
import { type ServerLocation } from "@/lib/server-utils"

interface OrdersPageClientProps {
  session: Session | null
  initialOrders: FeedOrder[]
  initialProfile: FullProfile | null
  serverLocation: ServerLocation
  popularCategories: PopularCategoryResult[]
  currentCategory: DBCategory | null
}

export default function OrdersPageClient({
  session,
  initialOrders,
  initialProfile,
  serverLocation,
  popularCategories,
  currentCategory
}: OrdersPageClientProps) {

  const queryClient = useQueryClient()
  const userId = session?.user?.id
  const queryKey = ["user-profile", userId]

  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)

  // --- ДАННЫЕ ПРОФИЛЯ ---
  const { data: profile } = useQuery<FullProfile | null>({
    queryKey,
    queryFn: async () => handleAction(getMyProfile()),
    initialData: initialProfile,
    enabled: !!userId,
  })

  const { radius: storeRadius, _hasHydrated, slug: storeSlug, setLocation } = useLocationStore()

  const activeFilters = useMemo(() => ({
    ...serverLocation,
    // Если стор еще не ожил, берем серверный радиус, чтобы ключ совпал с SSR
    radius: _hasHydrated ? storeRadius : serverLocation.radius
  }), [serverLocation, storeRadius, _hasHydrated])

  // --- ДАННЫЕ ЛЕНТЫ ---
  const { data: orders = [], isFetching: isOrdersFetching } = useQuery({
    queryKey: ["orders", activeFilters],
    queryFn: async () => await handleAction(getOrders(activeFilters)),
    // Используем placeholderData вместо initialData
    // Это позволит сохранить список заказов на экране, пока грузятся новые
    placeholderData: (previousData) => {
      // Если previousData существует (мы уже что-то загружали на клиенте) — оставляем его.
      // Если нет (это самый первый переход или сброс) — подставляем серверные initialOrders.
      return previousData ?? initialOrders;
    },
    initialData: () => {
      // Если радиус в фильтрах совпадает с тем, что пришло с сервера — отдаем готовые данные
      // Это предотвратит запрос при первой загрузке
      if (activeFilters.radius === serverLocation.radius) {
        return initialOrders;
      }
      return undefined;
    },
    // Теперь можно поставить нормальный staleTime
    staleTime: 1000 * 60 * 5,
  })

  // --- СПРАВОЧНИК КАТЕГОРИЙ ---
  const { data: allCategories = [] } = useQuery<DBCategory[]>({
    queryKey: ["all-categories"],
    queryFn: async () => handleAction(getAllCategories()),
    staleTime: 1000 * 60 * 10,
  })

  const mySkillIds = useMemo(() => {
    if (!profile?.skills) return new Set<string>()
    return new Set(profile.skills.map((s) => s.categoryId))
  }, [profile])

  const stats = useMemo(() => ({
    total: orders.length,
    matched: orders.filter(o => o.categories.some(c => mySkillIds.has(c.categoryId))).length
  }), [orders, mySkillIds])

  useEffect(() => {
    if (_hasHydrated && serverLocation.slug !== storeSlug) {
      // Обновляем глобальный стор данными, которые пришли из URL (от сервера)
      setLocation(
        serverLocation.city,
        serverLocation.lat,
        serverLocation.lng,
        serverLocation.slug,
        serverLocation.yandexUri
      )
    }
  }, [_hasHydrated, serverLocation, storeSlug])

  // --- МУТАЦИЯ С OPTIMISTIC UPDATE ---
  const { mutate: toggleSkill } = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'add' | 'remove' }) => {
      const actionFn = action === 'add' ? addSkill : removeSkill
      return await handleAction(actionFn(id))
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousProfile = queryClient.getQueryData<FullProfile>(queryKey)

      queryClient.setQueryData<FullProfile | null>(queryKey, (old) => {
        if (!old) return old
        if (action === 'remove') {
          return { ...old, skills: old.skills.filter(s => s.categoryId !== id) }
        }
        const cat = allCategories.find(c => c.id === id)
        if (!cat) return old

        return {
          ...old,
          skills: [...old.skills, {
            profileId: old.id,
            categoryId: id,
            category: { id: cat.id, name: cat.name, slug: cat.slug }
          }]
        }
      })
      return { previousProfile }
    },
    onSuccess: (_, variables) => {
      // Так как экшен возвращает null, мы ориентируемся на сам факт вызова onSuccess
      if (variables.action === 'add') {
        const name = allCategories.find(c => c.id === variables.id)?.name
        toast.success(`Ниша "${name}" добавлена`)
      }
      // Инвалидацию НЕ делаем, оставляем оптимистичные данные
    },
    onError: (err, variables, context) => {
      // Если сервер ответил ошибкой, откатываем к "правде" из базы
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKey, context.previousProfile)
      }
      // handleAction обычно сам кидает toast с ошибкой, но подстрахуемся
    }
  })

  // Теперь вызовы стали совсем элементарными
  const onAdd = (id: string) => toggleSkill({ id, action: 'add' });
  const onRemove = (id: string) => toggleSkill({ id, action: 'remove' });


  const displayRadius = _hasHydrated ? storeRadius : serverLocation.radius

  return (
    <Container className="bg-white max-w-7xl pt-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
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
            isAuth={!!session}
            profile={profile}
            popularCategories={popularCategories}
            serverLocation={serverLocation}
            onAddClick={() => setIsCatModalOpen(true)}
            onRemoveSkill={onRemove}
            cityName={serverLocation.city}
          />
        </aside>

        <section className="lg:col-span-9">
          {/* ЗАГОЛОВОК И СТАТИСТИКА: Теперь с фиксированным отступом снизу, чтобы не "прилипать" к блоку */}
          <div className="px-2 pt-4 pb-8 space-y-4">
            <div className="flex items-baseline gap-4 flex-wrap">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                {currentCategory ? (
                  <>
                    {currentCategory.name}{" "}
                    <span className="text-blue-600 ml-2 whitespace-nowrap">
                      в {serverLocation.city}
                    </span>
                  </>
                ) : (
                  <>
                    Заказы{" "}
                    <span className="text-blue-600 ml-2 whitespace-nowrap">
                      в {serverLocation.city}
                    </span>
                  </>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-black italic text-slate-100">/</span>
                <span className="text-5xl font-black italic text-slate-900 tracking-tighter">
                  {mySkillIds.size > 0 ? stats.matched : stats.total}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100 text-emerald-600">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span>всего рядом: {stats.total}</span>
              </div>
              <span className="ml-2">
                {mySkillIds.size > 0 ? `Подходит вам: ${stats.matched}` : "Все категории"}
                • {displayRadius}км
              </span>
            </div>
          </div>

          {/* ЕДИНЫЙ МОНОЛИТНЫЙ БЛОК: Тулбар + Контент */}
          <div className="flex flex-col shadow-2xl shadow-slate-200/40 rounded-[3.5rem] border border-slate-100 bg-white overflow-hidden">

            {/* TOOLBAR: Убрали внешние отступы, он теперь "крышка" контента */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-50">
              <OrdersToolbar
                viewMode={viewMode}
                setViewMode={setViewMode}
                serverCity={serverLocation.city}
                serverRadius={serverLocation.radius}
              // Внутри тулбара убери закругления и тени, если передаешь такой флаг
              />
            </div>

            {/* CONTENT AREA: Склеен с тулбаром без швов */}
            <div className={cn(
              "relative min-h-[700px] transition-all duration-500",
              viewMode === "list" ? "bg-white" : "bg-slate-50"
            )}>
              <FetchingRadar isVisible={isOrdersFetching} />

              <div className={cn("h-full transition-all duration-500", isOrdersFetching && "blur-sm opacity-50")}>
                {viewMode === "list" ? (
                  <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2">
                    <OrdersFeed orders={orders} mySkillIds={mySkillIds} isFetching={isOrdersFetching} />
                  </div>
                ) : (
                  <div className="h-[750px] w-full relative">
                    {/* Карта теперь занимает всё пространство до краев скругленного родителя */}
                    <MapViewport
                      orders={orders}
                      center={[serverLocation.lat, serverLocation.lng]}
                      radius={serverLocation.radius}
                      mySkillIds={mySkillIds}
                      isFetching={isOrdersFetching}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>


      </div>

      <LocationModal />
      <CategorySearchModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        userCategoryIds={Array.from(mySkillIds)}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    </Container>
  )
}
