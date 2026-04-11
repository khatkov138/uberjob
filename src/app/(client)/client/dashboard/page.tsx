"use client"

import { useQuery } from "@tanstack/react-query"
import { getClientOrders } from "@/app/actions/orders"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  Loader2,
  ClipboardList,
  CheckCircle2,
  CircleDashed,
  Rocket
} from "lucide-react"
import Link from "next/link"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"

export default function ClientDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["client-orders"],
    queryFn: () => getClientOrders(),
  })

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  )

  const orders = data?.data || []
  const activeOrders = orders.filter(o => o.status !== "COMPLETED" && o.status !== "CANCELLED")
  const historyOrders = orders.filter(o => o.status === "COMPLETED" || o.status === "CANCELLED")

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Шапка дашборда */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Рабочее пространство</h1>
          <p className="text-muted-foreground">Управляйте вашими задачами и мастерами</p>
        </div>
        <Button size="lg" className="rounded-xl font-bold gap-2" asChild>
          <Link href="/client/new-order">
            <Plus className="w-5 h-5" /> Создать заказ
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] h-12">
          <TabsTrigger value="active" className="gap-2 text-sm font-semibold">
            <CircleDashed className="w-4 h-4" /> Активные ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> История ({historyOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6">
          {activeOrders.length > 0 ? (
            activeOrders.map((order) => (
              <Link key={order.id} href={`/client/orders/${order.id}`} className="block group">
                {/* ДОБАВЛЯЕМ ОБЕРТКУ CARD ЗДЕСЬ */}
                <Card className="overflow-hidden border-l-4 border-l-blue-500 transition-all hover:shadow-md hover:border-l-blue-600 active:scale-[0.99]">
                  <CardContent className="p-5">
                    <OrderStatusCard order={order} type="client" />
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <EmptyState
              title="Нет активных задач"
              description="Создайте первый заказ, чтобы найти подходящего мастера."
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          {historyOrders.length > 0 ? (
            historyOrders.map((order) => (
              <Link key={order.id} href={`/client/orders/${order.id}`} className="block group">
                {/* ДОБАВЛЯЕМ ОБЕРТКУ CARD ЗДЕСЬ */}
                <Card className="overflow-hidden border-l-4 border-slate-300 transition-all hover:shadow-md active:scale-[0.99]">
                  <CardContent className="p-5">
                    <OrderStatusCard order={order} type="client" />
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <EmptyState
              title="История пуста"
              description="Здесь будут отображаться ваши выполненные заказы."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ title, description }: { title: string, description: string }) {
  return (
    <Card className="border-dashed bg-muted/30 shadow-none">
      <CardContent className="py-16 flex flex-col items-center justify-center text-center">
        <div className="bg-background p-4 rounded-full shadow-sm mb-4">
          <ClipboardList className="w-10 h-10 text-muted-foreground opacity-40" />
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground max-w-xs mt-2 text-sm">
          {description}
        </p>
        <Button variant="link" className="mt-4 text-blue-600 font-bold" asChild>
          <Link href="/client/new-order" className="gap-1">
            Начать поиск мастера <Rocket className="w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}