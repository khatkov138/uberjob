// app/(pro)/pro/feed/page.tsx
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
import { CategoryBar } from "./category-bar"

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

  const { data: profile } = useQuery({
    queryKey: ["user-profile", session?.user?.id],
    queryFn: async () => (await fetch("/api/user/profile")).json(),
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
    ? allOrders.filter((o: any) => userCategories.includes(o.categories))
    : allOrders

  if (isQueryLoading && !ordersData) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-sm font-bold text-muted-foreground italic">Загружаем ленту...</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6 pb-32">
      <FeedHeader filterMode={filterMode} setFilterMode={setFilterMode} />

      <CategoryBar
        userCategories={userCategories}
        onRemove={(skill: string) => toggleMutation.mutate(skill)}
      />

      <div className="grid gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order: any) => (
            <OrderCard
              userCategories={profile.skills}
              key={order.id}
              order={order}
              isMatched={userCategories.includes(order.category)}
              toggleCategory={(skill: string) => toggleMutation.mutate(skill)}
            />
          ))
        ) : (
          <div className="py-24 text-center border-4 border-dashed rounded-[3rem] bg-muted/10">
            <p className="font-black text-lg italic text-slate-400 uppercase">Здесь пока пусто</p>
          </div>
        )}
      </div>

      <LocationModal />
    </div>
  )
}
