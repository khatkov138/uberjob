"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getSmartNearbyFeed } from "./actions"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, MapPin, Navigation, Sparkles, Filter, ChevronDown } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { useLocationStore } from "@/store/use-location-store" 
import { LocationModal } from "@/components/geo/location-modal"

export default function SmartFeedPage() {
  const { data: session, isPending: isAuthLoading } = authClient.useSession()
  
  // 1. Берем всё из Zustand, включая управление модалкой
  const { 
    lat, lng, radius, city, setRadius, 
    isModalOpen, openModal, closeModal 
  } = useLocationStore()
  
  const [showOnlySkills, setShowOnlySkills] = React.useState(false)

  // 2. Логирование инициализации Яндекса (вынесено в useEffect)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // @ts-ignore
      window.ymaps?.ready(() => {
        console.log("✅ Яндекс.Карты готовы к работе");
      });
    }
  }, []);

  // 3. Запрос данных. Перезапускается сам при смене lat/lng/radius в сторе
  const { data, isLoading: isQueryLoading } = useQuery({
    queryKey: ["pro-feed", lat, lng, radius, session?.user?.id],
    queryFn: () => getSmartNearbyFeed(lat, lng, radius),
    enabled: !!lat && !!session?.user,
  })

  const allOrders = data?.data || []
  const filteredOrders = showOnlySkills
    ? allOrders.filter((o: any) => o.isMatch)
    : allOrders

  const isLoading = isAuthLoading || (isQueryLoading && !data)

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-sm font-bold text-muted-foreground animate-pulse italic">Синхронизация локации...</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black flex items-center gap-3 italic tracking-tighter">
            Лента <Navigation className="w-8 h-8 text-blue-600 fill-current" />
          </h1>
          
          {/* Открываем модалку через глобальный метод стора */}
          <button 
            onClick={openModal}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-blue-100 shadow-sm hover:bg-blue-50 transition-all group active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-700 text-[11px] font-black uppercase tracking-wider">{city}</span>
            <ChevronDown className="w-3 h-3 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>

        <div className="flex bg-muted/50 p-1.5 rounded-2xl border backdrop-blur-sm shadow-inner">
          {[10, 30, 60, 100].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              className={cn(
                "px-5 py-2 text-xs font-black rounded-xl transition-all duration-300",
                radius === r
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5 scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r} км
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-[2rem] border-2 border-dashed border-slate-200">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl transition-all",
            showOnlySkills ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-slate-400 border"
          )}>
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-black italic leading-none">Умный подбор</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1 tracking-tighter">
              {showOnlySkills ? "Ваша специализация" : "Все активные заказы в регионе"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowOnlySkills(!showOnlySkills)}
          className={cn(
            "relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-500",
            showOnlySkills ? "bg-blue-600 shadow-lg shadow-blue-200" : "bg-slate-200"
          )}
        >
          <span className={cn(
            "inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300",
            showOnlySkills ? "translate-x-7" : "translate-x-1"
          )} />
        </button>
      </div>

      <div className="grid gap-6 pb-20">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order: any) => (
            <Link key={order.id} href={`/pro/orders/${order.id}`} className="block group relative">
              {order.isMatch && (
                <div className="absolute -top-3 left-8 z-10 bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 uppercase tracking-tighter">
                  <Sparkles className="w-3 h-3 fill-current" /> Рекомендуем
                </div>
              )}

              <Card className={cn(
                "overflow-hidden border-2 transition-all duration-500 rounded-[2.5rem]",
                order.isMatch
                  ? "border-blue-500/30 shadow-xl shadow-blue-500/5 bg-white"
                  : "border-transparent opacity-90 hover:opacity-100"
              )}>
                <CardContent className="p-8">
                  <OrderStatusCard order={order} type="pro" />
                  <div className="mt-6 pt-6 border-t flex items-center justify-between">
                    <div className={cn(
                      "flex items-center gap-2 font-black px-4 py-2 rounded-full text-xs transition-all",
                      order.isMatch ? "bg-blue-600 text-white shadow-md" : "bg-slate-100 text-slate-600"
                    )}>
                      <MapPin className="w-4 h-4" />
                      {order.distance ? `${order.distance.toFixed(1)} км` : "Рядом"}
                    </div>
                    <span className="font-bold text-xs group-hover:translate-x-1 transition-transform flex items-center gap-1 text-slate-500">
                      Подробнее <Navigation className="w-4 h-4 rotate-90 fill-slate-500" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="py-24 text-center border-4 border-dashed rounded-[3rem] bg-muted/10 space-y-4 px-6">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-xl italic tracking-tight">
                {showOnlySkills ? "Ничего не найдено по навыкам" : "В этом районе пока тихо"}
              </p>
              <p className="text-muted-foreground text-xs max-w-xs mx-auto font-medium leading-relaxed">
                {showOnlySkills
                  ? "Попробуйте расширить свои категории в настройках или отключить фильтр"
                  : `Заказов в радиусе ${radius} км от г. ${city} не найдено.`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Модалка теперь управляется из стора */}
      <LocationModal/>
    </div>
  )
}
