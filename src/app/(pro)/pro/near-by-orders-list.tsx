"use client"

import { useQuery } from "@tanstack/react-query"
import { getNearbyOrders } from "@/app/actions/pro"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, RussianRuble } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { AcceptOrderButton } from "./accept-order-button"

export function NearbyOrdersList() {
  // 1. Получаем координаты мастера (в реальном проекте лучше через контекст или стейт)
  const { data, isLoading } = useQuery({
    queryKey: ["nearby-orders"],
    queryFn: async () => {
      // Имитируем получение координат (например, Москва)
      // В идеале: navigator.geolocation.getCurrentPosition(...)
      const coords = { lat: 55.75, lng: 37.61 }
      return getNearbyOrders(coords.lat, coords.lng, 15)
    },
  })

  if (isLoading) return <OrderSkeleton />

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-bold">Заказы поблизости (15 км)</h2>
      {data?.data?.map((order) => (
        <Card key={order.id} className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{order.title}</CardTitle>
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded font-medium">
                {order.category}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="line-clamp-2">{order.description}</p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {order.address}
              </div>
              <div className="flex items-center gap-1 font-bold text-foreground">
                <RussianRuble className="w-4 h-4" /> {order.price / 100}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <AcceptOrderButton orderId={order.id}/>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function OrderSkeleton() {
  return <Skeleton className="h-[200px] w-full rounded-xl" />
}