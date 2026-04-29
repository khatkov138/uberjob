"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"

// Store & Libs
import { useLocationStore } from "@/store/use-location-store"
import { roundCoord } from "@/lib/location-config"
import { handleAction } from "@/lib/utils"

// Actions & Types
import { getOrders, type FeedOrder } from "@/actions/order/get"
import { getMyProfile, type FullProfile } from "@/actions/profile/get"
import { addSkill, removeSkill } from "@/actions/profile/manage"
import { type DBCategory } from "@/actions/category/get"
import type { Session } from "@/lib/auth"

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

interface OrdersPageClientProps {
  session: Session
  initialOrders: FeedOrder[]
  initialProfile: FullProfile | null
  serverLocation: { lat: number; lng: number; radius: number; city: string }
}

type UserSkill = NonNullable<FullProfile>["skills"][number]

export default function OrdersPageClient({
  session,
  initialOrders,
  initialProfile,
  serverLocation
}: OrdersPageClientProps) {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = React.useState<"list" | "map">("list")
  const [isCatModalOpen, setIsCatModalOpen] = React.useState(false)

  const { lat, lng, radius, city, _hasHydrated } = useLocationStore()

  // --- ГЕО ПАРАМЕТРЫ ---
  const currentLat = roundCoord(_hasHydrated ? lat : serverLocation.lat)
  const currentLng = roundCoord(_hasHydrated ? lng : serverLocation.lng)
  const currentRadius = _hasHydrated ? radius : serverLocation.radius

  const isServerKey = currentLat === roundCoord(serverLocation.lat) &&
    currentLng === roundCoord(serverLocation.lng) &&
    currentRadius === serverLocation.radius

  // --- QUERIES ---
  const { data: orders = [], isFetching: isOrdersFetching, isPending: isInitialLoading } = useQuery<FeedOrder[]>({
    queryKey: ["orders", currentLat, currentLng, currentRadius, session.user.id],
    queryFn: () => handleAction(getOrders({ lat: currentLat, lng: currentLng, radius: currentRadius })),
    initialData: isServerKey ? initialOrders : undefined,
    placeholderData: keepPreviousData, // ЭТО УБЕРЕТ СКАЧОК В 0
  })

  const profileKey = ["user-profile", session.user.id]
  const { data: profile } = useQuery<FullProfile | null>({
    queryKey: profileKey,
    queryFn: () => handleAction(getMyProfile()),
    initialData: initialProfile ?? undefined,
  })

  // --- MUTATIONS ---
  const { mutate: handleToggleSkill } = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'add' | 'remove' }) => {
      return action === 'add' ? handleAction(addSkill(id)) : handleAction(removeSkill(id))
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: profileKey })
      const prev = queryClient.getQueryData<FullProfile>(profileKey)
      if (prev) {
        const allCats = queryClient.getQueryData<DBCategory[]>(["all-categories"])
        const catName = allCats?.find(c => c.id === id)?.name || "..."
        queryClient.setQueryData<FullProfile>(profileKey, {
          ...prev,
          skills: action === 'add'
            ? [...prev.skills, { categoryId: id, category: { name: catName } } as UserSkill]
            : prev.skills.filter(s => s.categoryId !== id)
        })
      }
      return { prev }
    },
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(profileKey, context.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKey })
  })

  const mySkillIds = React.useMemo(() => new Set(profile?.skills.map(s => s.categoryId) || []), [profile])

  const sortedOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => {
      const aMatch = a.categories.some(c => mySkillIds.has(c.categoryId)) ? 1 : 0
      const bMatch = b.categories.some(c => mySkillIds.has(c.categoryId)) ? 1 : 0
      if (aMatch !== bMatch) return bMatch - aMatch
      return (a.distance || 0) - (b.distance || 0)
    })
  }, [orders, mySkillIds])

  const stats = React.useMemo(() => {
    if (!_hasHydrated) {
      // Пока стор не ожил, считаем статсу по серверным заказам
      return {
        total: initialOrders.length,
        matched: initialOrders.filter(o => o.categories.some(c => mySkillIds.has(c.categoryId))).length
      }
    }
    return {
      total: orders.length,
      matched: orders.filter(o => o.categories.some(c => mySkillIds.has(c.categoryId))).length
    }
  }, [orders, initialOrders, mySkillIds, _hasHydrated])

  if (isInitialLoading && !initialOrders.length) return <LoadingState />

  return (
    <Container className="bg-white max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ЛЕВАЯ КОЛОНКА */}
        <aside className="lg:col-span-4">
          <OrdersSidebar
            stats={stats}
            skills={profile?.skills || []}
            onAddClick={() => setIsCatModalOpen(true)}
            onRemoveSkill={(id) => handleToggleSkill({ id, action: 'remove' })}
          />
        </aside>

        {/* ПРАВАЯ КОЛОНКА */}
        <section className="lg:col-span-8 space-y-6">
          <OrdersToolbar
            viewMode={viewMode}
            setViewMode={setViewMode}
            city={_hasHydrated ? city : serverLocation.city}
          />

          {/* Стабильный контейнер для вьюпорта */}
          <div className="relative min-h-[650px] rounded-[3rem] shadow-2xl shadow-slate-100 bg-slate-50">
            <FetchingRadar isVisible={isOrdersFetching} />

            {viewMode === "list" ? (
              <div className="animate-in fade-in duration-300">
                <OrdersFeed
                  orders={sortedOrders}
                  mySkillIds={mySkillIds}
                  isFetching={isOrdersFetching}
                />
              </div>
            ) : (
              <div className="h-[650px] w-full animate-in fade-in duration-300">
                <MapViewport
                  orders={orders}
                  center={[currentLat, currentLng]}
                  radius={currentRadius}
                  mySkillIds={mySkillIds}
                  isFetching={isOrdersFetching}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <LocationModal />
      <CategorySearchModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        userCategoryIds={Array.from(mySkillIds)}
        onAdd={(id) => handleToggleSkill({ id, action: 'add' })}
        onRemove={(id) => handleToggleSkill({ id, action: 'remove' })}
      />
    </Container>
  )
}
