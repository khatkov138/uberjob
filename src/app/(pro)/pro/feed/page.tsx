"use client"

import { useQuery } from "@tanstack/react-query"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, AlertCircle, ChevronRight } from "lucide-react"
import Link from "next/link"
import { getSmartNearbyFeed } from "./actions"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"

export default function SmartFeedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["pro-feed"],
    queryFn: () => getSmartNearbyFeed(),
  })

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  )

  // Если у мастера не заполнены навыки в профиле
  if (data?.needsSkills) return <NoSkillsWarning />

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <header className="space-y-1">
        <h1 className="text-3xl font-black flex items-center gap-2">
          Умная лента <Sparkles className="w-6 h-6 text-blue-500 fill-blue-500" />
        </h1>
        <p className="text-muted-foreground">Заказы, подобранные специально под ваши навыки</p>
      </header>

      <div className="grid gap-4">
        {data?.data && data.data.length > 0 ? (
          data.data.map((order) => (
            <Link 
              key={order.id} 
              href={`/pro/orders/${order.id}`} 
              className="block group"
            >
              <Card className="overflow-hidden border-l-4 border-l-blue-500 transition-all hover:shadow-lg hover:border-l-blue-600 active:scale-[0.98]">
                <CardContent className="p-6">
                  {/* Передаем чистый контент без ссылок внутри */}
                  <OrderStatusCard order={order} type="pro" />
                  
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                      Нажмите, чтобы узнать подробности
                    </span>
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                      Открыть заказ <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <EmptyFeed />
        )}
      </div>
    </div>
  )
}

function NoSkillsWarning() {
  return (
    <Card className="max-w-md mx-auto mt-20 text-center p-8 border-2 border-dashed bg-muted/20">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
      <h2 className="text-xl font-bold mb-2">Специализация не указана</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Чтобы видеть подходящие заказы, нам нужно знать, что вы умеете делать.
      </p>
      <Button asChild className="w-full h-12 font-bold rounded-xl" size="lg">
        <Link href="/pro/profile">Настроить профиль</Link>
      </Button>
    </Card>
  )
}

function EmptyFeed() {
  return (
    <div className="py-24 text-center border-2 border-dashed rounded-3xl bg-muted/10">
      <p className="text-lg font-medium text-muted-foreground">Сейчас новых заказов нет</p>
      <p className="text-sm text-muted-foreground/60 mb-6">Попробуйте зайти позже или добавьте больше навыков</p>
      <Button variant="outline" asChild>
        <Link href="/pro/profile">Редактировать навыки</Link>
      </Button>
    </div>
  )
}