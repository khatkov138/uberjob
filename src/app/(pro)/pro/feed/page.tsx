"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSmartNearbyFeed, toggleMasterSkill } from "./actions"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Loader2, 
  MapPin, 
  Navigation, 
  Sparkles, 
  ChevronDown, 
  X, 
  Plus, 
  Check,
  Zap
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { useLocationStore } from "@/store/use-location-store" 
import { LocationModal } from "@/components/geo/location-modal"

export default function SmartFeedPage() {
  const queryClient = useQueryClient()
  const { data: session, isPending: isAuthLoading } = authClient.useSession()
  
  // Гео-данные из Zustand
  const { lat, lng, radius, city, setRadius, openModal } = useLocationStore()
  
  // Режим фильтрации: "Все категории" или "Мои категории"
  const [filterMode, setFilterMode] = React.useState<"ALL" | "MY">("ALL")

  // 1. Загрузка заказов
  const { data: ordersData, isLoading: isQueryLoading } = useQuery({
    queryKey: ["pro-feed", lat, lng, radius, session?.user?.id],
    queryFn: () => getSmartNearbyFeed(lat, lng, radius),
    enabled: !!lat && !!session?.user,
  })

  // 2. Загрузка профиля (чтобы знать выбранные категории мастера)
  const { data: profile } = useQuery({
    queryKey: ["user-profile", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user/profile")
      return res.json()
    },
    enabled: !!session?.user?.id
  })

  // 3. Мутация для мгновенного переключения категорий
  const toggleMutation = useMutation({
    mutationFn: toggleMasterSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      queryClient.invalidateQueries({ queryKey: ["pro-feed"] })
    }
  })

  const userCategories = profile?.skills || []
  const allOrders = ordersData?.data || []
  
  // Фильтрация списка на клиенте
  const filteredOrders = filterMode === "MY" 
    ? allOrders.filter((o: any) => userCategories.includes(o.category)) 
    : allOrders

  const isLoading = isAuthLoading || (isQueryLoading && !ordersData)

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-sm font-bold text-muted-foreground animate-pulse italic">Настраиваем вашу ленту категорий...</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 w-full md:w-auto">
          <h1 className="text-4xl font-black flex items-center gap-3 italic tracking-tighter uppercase">
            Лента <Zap className="w-8 h-8 text-blue-600 fill-current" />
          </h1>
          
          <div className="flex flex-wrap gap-2">
            {/* Выбор города */}
            <button 
              onClick={openModal}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-blue-100 shadow-sm hover:bg-blue-50 transition-all active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-blue-700 text-[11px] font-black uppercase tracking-wider">{city}</span>
              <ChevronDown className="w-3 h-3 text-blue-400" />
            </button>

            {/* Выбор радиуса */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              {[10, 30, 60, 100].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase",
                    radius === r 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {r} км
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Переключатель ленты */}
        <div className="flex bg-muted/50 p-1.5 rounded-2xl border backdrop-blur-sm">
          <button
            onClick={() => setFilterMode("ALL")}
            className={cn(
              "px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase",
              filterMode === "ALL" ? "bg-white text-blue-600 shadow-sm" : "text-muted-foreground"
            )}
          >
            Все подряд
          </button>
          <button
            onClick={() => setFilterMode("MY")}
            className={cn(
              "px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase",
              filterMode === "MY" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-muted-foreground"
            )}
          >
            Мои категории
          </button>
        </div>
      </header>

      {/* Горизонтальный список активных категорий мастера */}
      <div className="space-y-3">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Ваши активные категории</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {userCategories.length > 0 ? (
            userCategories.map((skill: string) => (
              <button
                key={skill}
                onClick={() => toggleMutation.mutate(skill)}
                className="group flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap shadow-md shadow-blue-100 transition-all hover:bg-red-500"
              >
                {skill} <X className="w-3.5 h-3.5 opacity-70" />
              </button>
            ))
          ) : (
            <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-slate-400 italic">
              Подпишитесь на категории работ, нажимая на теги в заказах.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order: any) => {
            const isMatched = userCategories.includes(order.category)
            
            return (
              <div key={order.id} className="relative group">
                {isMatched && (
                  <div className="absolute -top-3 left-8 z-10 bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 uppercase tracking-tighter">
                    <Sparkles className="w-3 h-3 fill-current" /> Для вас
                  </div>
                )}

                <Card className={cn(
                  "overflow-hidden border-2 transition-all duration-500 rounded-[2.5rem]",
                  isMatched 
                    ? "border-blue-500/30 shadow-xl bg-white" 
                    : "border-transparent opacity-90 hover:opacity-100"
                )}>
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      
                      {/* Интерактивный тег категории */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          toggleMutation.mutate(order.category)
                        }}
                        className={cn(
                          "group/tag flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95",
                          isMatched 
                            ? "bg-blue-50 border-blue-100 text-blue-600 shadow-sm" 
                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                        )}
                      >
                        <div className="relative w-3.5 h-3.5">
                           {isMatched ? (
                             <Check className="w-3.5 h-3.5 transition-all group-hover/tag:scale-0 opacity-100 group-hover/tag:opacity-0" />
                           ) : (
                             <Plus className="w-3.5 h-3.5 transition-all group-hover/tag:scale-125" />
                           )}
                           {isMatched && <X className="w-3.5 h-3.5 absolute inset-0 opacity-0 group-hover/tag:opacity-100 group-hover/tag:scale-100 scale-50 transition-all text-red-500" />}
                        </div>
                        {order.category}
                      </button>

                      {isMatched && <div className="text-blue-600 animate-pulse"><Sparkles className="w-4 h-4 fill-current" /></div>}
                    </div>

                    <Link href={`/pro/orders/${order.id}`}>
                      <OrderStatusCard order={order} type="pro" />
                    </Link>
                    
                    <div className="mt-6 pt-6 border-t flex items-center justify-between">
                      <div className={cn(
                        "flex items-center gap-2 font-black px-4 py-2 rounded-full text-xs transition-all",
                        isMatched ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        <MapPin className="w-4 h-4" />
                        {order.distance ? `${order.distance.toFixed(1)} км` : "Рядом"}
                      </div>
                      <Link 
                        href={`/pro/orders/${order.id}`}
                        className="font-bold text-[10px] flex items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-[0.1em]"
                      >
                        Детали заказа <Navigation className="w-3.5 h-3.5 rotate-90" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })
        ) : (
          <div className="py-24 text-center border-4 border-dashed rounded-[3rem] bg-muted/10 space-y-4">
            <p className="font-black text-lg italic text-slate-400">
              {filterMode === "MY" ? "Нет заказов по вашим категориям" : "В этом радиусе пока тихо"}
            </p>
          </div>
        )}
      </div>

      <LocationModal />
    </div>
  )
}
