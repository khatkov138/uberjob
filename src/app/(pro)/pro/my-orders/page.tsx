"use client"

import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Briefcase, History, ChevronRight } from "lucide-react"


import Link from "next/link"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"
import { getProOrders } from "@/actions/pro"

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
      <header>
        <h1 className="text-3xl font-black tracking-tight">Мои работы</h1>
        <p className="text-muted-foreground">Список ваших активных и завершенных заказов</p>
      </header>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] h-12">
          <TabsTrigger value="active" className="gap-2 font-bold">
            <Briefcase className="w-4 h-4" /> В работе ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 font-bold">
            <History className="w-4 h-4" /> История ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* АКТИВНЫЕ ЗАКАЗЫ */}
        <TabsContent value="active" className="space-y-4 mt-6">
          {activeOrders.length > 0 ? (
            activeOrders.map((order) => (
              <Link 
                key={order.id} 
                href={`/pro/orders/${order.id}`} 
                className="block group"
              >
                <Card className="overflow-hidden border-l-4 border-l-blue-600 transition-all hover:shadow-md active:scale-[0.99]">
                  <CardContent className="p-5 flex items-center justify-between">
                   <OrderStatusCard order={order} showPrice={true} />
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <EmptyState message="У вас пока нет активных заказов" />
          )}
        </TabsContent>

        {/* ИСТОРИЯ */}
        <TabsContent value="history" className="space-y-4 mt-6">
          {completedOrders.length > 0 ? (
            completedOrders.map((order) => (
              <Link 
                key={order.id} 
                href={`/pro/orders/${order.id}`} 
                className="block group"
              >
                <Card className="overflow-hidden border-l-4 border-slate-300 transition-all hover:shadow-md grayscale-[0.5] hover:grayscale-0">
                  <CardContent className="p-5 flex items-center justify-between">
                  <OrderStatusCard order={order} showPrice={true} />
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
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
    <Card className="border-dashed bg-muted/20 shadow-none">
      <CardContent className="py-16 flex flex-col items-center justify-center text-muted-foreground">
        <Briefcase className="w-12 h-12 mb-4 opacity-10" />
        <p className="font-medium">{message}</p>
      </CardContent>
    </Card>
  )
}