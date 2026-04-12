"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getSmartNearbyFeed } from "./actions"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Sparkles, MapPin, Navigation } from "lucide-react"
import Link from "next/link"

export default function SmartFeedPage() {
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null)

  // Запрашиваем геопозицию при загрузке
  React.useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.log("Геопозиция отклонена или недоступна")
    )
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["pro-feed", coords], // Координаты в ключе, чтобы перезапросить при получении гео
    queryFn: () => getSmartNearbyFeed(coords?.lat, coords?.lng),
  })

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            Поблизости <Navigation className="w-6 h-6 text-blue-500 fill-blue-500" />
          </h1>
          <p className="text-muted-foreground text-sm">
            {coords ? "Заказы в радиусе 30 км" : "Настройте геопозицию для точного поиска"}
          </p>
        </div>
      </header>

      <div className="grid gap-4">
        {data?.data && data.data.length > 0 ? (
          data.data.map((order: any) => (
            <Link key={order.id} href={`/pro/orders/${order.id}`} className="block group">
              <Card className="overflow-hidden border-l-4 border-l-blue-500 transition-all hover:shadow-lg active:scale-[0.98]">
                <CardContent className="p-6">
                  <OrderStatusCard order={order} type="pro" />
                  
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 font-bold text-blue-600">
                      <MapPin className="w-4 h-4" />
                      {order.distance 
                        ? `${order.distance.toFixed(1)} км от вас` 
                        : order.address}
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      Смотреть детали →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed rounded-3xl">
             <p className="text-muted-foreground">Заказов рядом пока нет. Попробуйте обновить страницу позже.</p>
          </div>
        )}
      </div>
    </div>
  )
}