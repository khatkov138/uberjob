"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSmartNearbyFeed, toggleMasterSkill } from "./actions"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useLocationStore } from "@/store/use-location-store"
import { LocationModal } from "@/components/geo/location-modal"
import { OrderCard } from "./order-card"
import { FeedHeader } from "./feed-header"

export default function SmartFeedPage() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const { lat, lng, radius } = useLocationStore()

  // Режим фильтрации: "ALL" - все заказы, "MY" - только по моим категориям
  const [filterMode, setFilterMode] = React.useState<"ALL" | "MY">("ALL")

  // 1. Загружаем заказы в радиусе
  const { data: ordersData, isLoading: isQueryLoading } = useQuery({
    queryKey: ["pro-feed", lat, lng, radius, session?.user?.id],
    queryFn: () => getSmartNearbyFeed(lat, lng, radius),
    enabled: !!lat && !!session?.user,
  })

  // 2. Загружаем профиль мастера, чтобы знать его категории (skills)
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user-profile", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user/profile")
      return res.json()
    },
    enabled: !!session?.user?.id
  })

  // 3. Мутация для добавления/удаления категории
  const toggleMutation = useMutation({
    mutationFn: toggleMasterSkill,
    onSuccess: () => {
      // Обновляем данные профиля и ленты после изменения
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      queryClient.invalidateQueries({ queryKey: ["pro-feed"] })
    }
  })

  const userCategories = profile?.skills || []
  const allOrders = ordersData?.data || []

  // 4. Логика фильтрации: 
  // Если режим "MY", оставляем только те заказы, где хотя бы одна категория совпадает с навыками мастера
  const filteredOrders = filterMode === "MY"
    ? allOrders.filter((order: any) =>
      order.categories.some((cat: string) => userCategories.includes(cat))
    )
    : allOrders

  const isLoading = isQueryLoading || isProfileLoading

  if (isLoading && !ordersData) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-sm font-bold text-muted-foreground italic">Синхронизируем заказы...</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6 pb-32">
      {/* Хедер с выбором города и радиуса */}
      <FeedHeader
        userCategories={profile?.skills || []} // Если profile еще undefined, уйдет []
        toggleCategory={(skill: string) => toggleMutation.mutate(skill)}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
      />

     

      {/* Список заказов */}
      <div className="grid gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              userCategories={userCategories} // Массив строк ["Электрика", ...]
              // Проверяем, подходит ли заказ (есть ли пересечение категорий)
              isMatched={order.categories.some((cat: string) => userCategories.includes(cat))}
              toggleCategory={(skill: string) => toggleMutation.mutate(skill)}
            />
          ))
        ) : (
          <div className="py-24 text-center border-4 border-dashed rounded-[3rem] bg-muted/10">
            <p className="font-black text-lg italic text-slate-400 uppercase">
              {filterMode === "MY" ? "Нет подходящих категорий" : "В этом районе пока тихо"}
            </p>
          </div>
        )}
      </div>

      <LocationModal />
    </div>
  )
}
