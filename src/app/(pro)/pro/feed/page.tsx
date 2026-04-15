"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSmartNearbyFeed, toggleMasterSkill } from "./actions"
import { Loader2, Inbox } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useLocationStore } from "@/store/use-location-store"
import { LocationModal } from "@/components/geo/location-modal"
import { FeedHeader } from "./feed-header"
import { OrderCard } from "./order-card"

export default function SmartFeedPage() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const { lat, lng, radius } = useLocationStore()

  const [filterMode, setFilterMode] = React.useState<"ALL" | "MY">("ALL")

  const { data: ordersData, isLoading: isQueryLoading } = useQuery({
    queryKey: ["pro-feed", lat, lng, radius, session?.user?.id],
    queryFn: () => getSmartNearbyFeed(lat, lng, radius),
    enabled: !!lat && !!session?.user,
  })

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user-profile", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user/profile")
      return res.json()
    },
    enabled: !!session?.user?.id
  })

  const toggleMutation = useMutation({
    mutationFn: toggleMasterSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      queryClient.invalidateQueries({ queryKey: ["pro-feed"] })
    }
  })

  const userCategories = profile?.skills || []
  const allOrders = ordersData?.data || []

  const filteredOrders = filterMode === "MY"
    ? allOrders.filter((order: any) =>
      order.categories.some((cat: string) => userCategories.includes(cat))
    )
    : allOrders

  const isLoading = isQueryLoading || isProfileLoading

  if (isLoading && !ordersData) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50 gap-4">
      <Loader2 className="animate-spin text-blue-600 w-12 h-12 stroke-[3]" />
      <div className="flex flex-col items-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 italic">ZWORK / SYSTEM</p>
        <p className="text-sm font-bold text-slate-600 italic">Синхронизируем заказы...</p>
      </div>
    </div>
  )

  return (
    // ДОБАВИЛ ФОН И МИНИМАЛЬНУЮ ВЫСОТУ
    <main className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto space-y-10 p-4 md:p-8 pb-32">
        
        <FeedHeader
          userCategories={userCategories}
          toggleCategory={(skill: string) => toggleMutation.mutate(skill)}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
        />

        <div className="grid gap-8">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order: any) => (
              <OrderCard
                key={order.id}
                order={order}
                userCategories={userCategories}
                isMatched={order.categories.some((cat: string) => userCategories.includes(cat))}
                toggleCategory={(skill: string) => toggleMutation.mutate(skill)}
              />
            ))
          ) : (
            <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="flex flex-col items-center gap-4">
                <Inbox className="w-12 h-12 text-slate-200" />
                <div className="space-y-1">
                    <p className="font-black text-xl italic text-slate-400 uppercase tracking-tighter">
                      {filterMode === "MY" ? "Нет подходящих заказов" : "В этом районе пока тихо"}
                    </p>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Попробуйте увеличить радиус поиска</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <LocationModal />
      </div>
    </main>
  )
}
