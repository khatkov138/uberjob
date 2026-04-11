"use client"

import { useQuery } from "@tanstack/react-query"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Briefcase, History } from "lucide-react"
import { getProOrders } from "./actions"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"
import { CompleteOrderButton } from "../complete-order-button"

export default function ProOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["pro-orders"],
    queryFn: () => getProOrders(),
  })

  if (isLoading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )

  const activeOrders = data?.data?.filter(o => o.status === "ACCEPTED" || o.status === "IN_PROGRESS") || []
  const completedOrders = data?.data?.filter(o => o.status === "COMPLETED") || []

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Мои работы</h1>
      </header>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="active" className="gap-2">
            <Briefcase className="w-4 h-4" /> В работе ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> История ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* АКТИВНЫЕ ЗАКАЗЫ */}
        <TabsContent value="active" className="space-y-4 mt-6">
          {activeOrders.length > 0 ? (
            activeOrders.map((order) => (
              <div key={order.id} className="relative">
                <OrderStatusCard order={order} type="pro" />
                <div className="absolute top-4 right-4">
                    {/* Наша кнопка завершения из прошлого шага */}
                    <CompleteOrderButton orderId={order.id} />
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="У вас пока нет активных заказов" />
          )}
        </TabsContent>

        {/* ИСТОРИЯ */}
        <TabsContent value="history" className="space-y-4 mt-6">
          {completedOrders.length > 0 ? (
            completedOrders.map((order) => (
              <OrderStatusCard key={order.id} order={order} type="pro" />
            ))
          ) : (
            <EmptyState message="История заказов пуста" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
        <Briefcase className="w-12 h-12 mb-4 opacity-20" />
        <p>{message}</p>
      </CardContent>
    </Card>
  )
}