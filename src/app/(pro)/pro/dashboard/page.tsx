import { getProStats, getActiveWorkSummary } from "./actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Wallet, 
  Star, 
  CheckCircle2, 
  TrendingUp, 
  Search, 
  ArrowRight,
  Briefcase,
  ArrowUpRight
} from "lucide-react"
import Link from "next/link"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"

export default async function ProDashboard() {
  const [stats, activeWorks] = await Promise.all([
    getProStats(),
    getActiveWorkSummary()
  ])

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      {/* 1. ПРИВЕТСТВИЕ И ПОИСК */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Панель мастера</h1>
          <p className="text-muted-foreground text-sm">Ваши показатели и текущие задачи</p>
        </div>
        <Button className="rounded-xl font-bold gap-2 h-12 px-6 shadow-lg shadow-primary/20" asChild>
          <Link href="/pro/feed">
            <Search className="w-5 h-5" /> Найти новые заказы
          </Link>
        </Button>
      </header>

      {/* 2. СЕТКА СТАТИСТИКИ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Доход" 
          value={`${stats?.earnings.toLocaleString() || 0} ₽`} 
          icon={<Wallet className="w-5 h-5 text-emerald-500" />}
          trend="Доступно к выводу" 
        />
        <StatCard 
          title="Рейтинг" 
          value={stats?.rating.toFixed(1) || "5.0"} 
          icon={<Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
          trend={`${stats?.reviewsCount || 0} отзывов`}
        />
        <StatCard 
          title="Завершено" 
          value={stats?.completedCount || 0} 
          icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />}
          trend="Всего заказов" 
        />
        <StatCard 
          title="Статус" 
          value="Топ-мастер" 
          icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
          trend="Виден всем клиентам" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. СПИСОК ТЕКУЩИХ РАБОТ */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" /> Сейчас в работе
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-blue-600 font-bold hover:bg-blue-50">
              <Link href="/pro/my-orders">
                Все заказы ({activeWorks?.length || 0}) <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {activeWorks && activeWorks.length > 0 ? (
            <div className="grid gap-3">
              {activeWorks.map((order) => (
                <Link key={order.id} href={`/pro/orders/${order.id}`} className="block group">
                  {/* Возвращаем Card и CardContent для визуального оформления */}
                  <Card className="overflow-hidden border-l-4 border-l-blue-600 transition-all hover:shadow-md active:scale-[0.99]">
                    <CardContent className="p-5">
                      <div className="transition-all group-hover:translate-x-1">
                        <OrderStatusCard order={order} type="pro" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed bg-muted/20 shadow-none">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-sm mb-4">У вас нет активных задач</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/pro/feed">Взять первый заказ</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 4. БОКОВАЯ ПАНЕЛЬ */}
        <div className="space-y-6">
          <Card className="bg-blue-600 text-white border-none overflow-hidden shadow-xl">
            <CardContent className="p-6 space-y-4 relative">
              <div className="z-10 relative">
                <h3 className="font-bold text-lg mb-1">Лента заказов</h3>
                <p className="text-sm opacity-90 mb-4">Проверьте новые заявки по вашим навыкам рядом с вами.</p>
                <Button variant="secondary" size="sm" className="w-full font-bold" asChild>
                  <Link href="/pro/feed">Открыть <ArrowUpRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </div>
              <Search className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
            </CardContent>
          </Card>

          <Card className="p-6 space-y-4 bg-card border shadow-none">
             <h3 className="font-bold text-sm">Ваш профиль</h3>
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                   <span className="text-muted-foreground">Заполнение</span>
                   <span>85%</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                   <div className="bg-blue-600 h-full w-[85%]" />
                </div>
             </div>
             <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                <Link href="/pro/profile">Редактировать навыки</Link>
             </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Вспомогательный компонент остается без изменений
function StatCard({ title, value, icon, trend }: any) {
  return (
    <Card className="border-none shadow-sm bg-card hover:ring-2 ring-primary/5 transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <div className="p-2 bg-muted/50 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1 font-semibold uppercase tracking-tight">{trend}</p>
      </CardContent>
    </Card>
  )
}