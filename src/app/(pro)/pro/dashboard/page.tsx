import * as React from "react"
import { getProStats, getActiveWorkSummary } from "./actions"
import { Container } from "@/components/shared/container"
import { getServerSession } from "@/lib/get-session"
import { 
  Zap, 
  Wallet, 
  Star, 
  Search, 
  ArrowUpRight, 
  Briefcase,
  MessageSquare,
  Settings,
  Layers
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"

export default async function ProDashboardPage() {
  const session = await getServerSession()
  const [stats, activeWorks] = await Promise.all([
    getProStats(),
    getActiveWorkSummary()
  ])

  return (
    <Container className="bg-white">
      {/* ПРИВЕТСТВИЕ */}
      <header className="space-y-2 mb-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">PRO / HUB</span>
          <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
          Привет, <span className="text-blue-600">{session?.user?.name?.split(' ')[0]}</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ЛЕВАЯ ЧАСТЬ (8 колонок) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ГЛАВНОЕ ДЕЙСТВИЕ: ЛЕНТА */}
          <Link href="/pro/feed" className="group block">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden transition-all hover:scale-[1.01] active:scale-95 shadow-xl">
              <Search className="absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
                  Найти новые <br /> заказы
                </h2>
                <div className="flex items-center gap-2 bg-emerald-500/20 w-fit px-4 py-2 rounded-xl backdrop-blur-sm border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Работа в вашем районе</span>
                </div>
              </div>
            </div>
          </Link>

          {/* СЕТКА С ОТКЛИКАМИ И СООБЩЕНИЯМИ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* МОИ ОТКЛИКИ (Та самая кнопка) */}
            <Link href="/pro/my-offers" className="group">
              <div className="h-full bg-blue-600 rounded-[2rem] p-8 text-white flex flex-col justify-between min-h-[200px] transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Layers className="w-8 h-8" />
                  </div>
                  <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">Мои отклики</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic">Управление предложениями</p>
                </div>
              </div>
            </Link>

            {/* СООБЩЕНИЯ */}
            <Link href="/pro/messages" className="group">
              <div className="h-full bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-slate-900 flex flex-col justify-between min-h-[200px] transition-all hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-blue-600">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">Сообщения</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Чаты с заказчиками</p>
                </div>
              </div>
            </Link>
          </div>

          {/* СПИСОК "В РАБОТЕ" */}
          <div className="pt-4 space-y-6">
             <div className="flex items-center gap-2 px-2 border-l-4 border-blue-600">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h3 className="font-black uppercase italic text-slate-900">Сейчас в работе</h3>
             </div>

             {activeWorks && activeWorks.length > 0 ? (
                <div className="grid gap-4">
                   {activeWorks.slice(0, 3).map((order: any) => (
                      <Link key={order.id} href={`/pro/orders/${order.id}`} className="group block">
                        <div className="bg-slate-50 hover:bg-white border border-slate-100 rounded-3xl p-6 transition-all hover:shadow-lg group-hover:-translate-y-0.5">
                           <OrderStatusCard order={order} showPrice={true} />
                        </div>
                      </Link>
                   ))}
                </div>
             ) : (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                   <p className="font-black text-slate-300 uppercase italic">Пока нет активных задач</p>
                </div>
             )}
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: СТАТИСТИКА И ПРОФИЛЬ (4 колонки) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ПЛИТКА ДОХОДА */}
          <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] flex flex-col justify-between min-h-[160px]">
             <div className="flex justify-between items-start">
               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Ваш доход</p>
               <Wallet className="w-5 h-5 text-emerald-500" />
             </div>
             <div>
               <p className="text-4xl font-black italic text-slate-900 tracking-tighter leading-none">
                 {stats?.earnings.toLocaleString() || 0} <span className="text-xl">₽</span>
               </p>
               <p className="text-[9px] font-bold text-emerald-600/60 uppercase mt-2 italic">Доступно к выводу</p>
             </div>
          </div>

          {/* ПЛИТКА РЕЙТИНГА */}
          <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2rem] flex flex-col justify-between min-h-[160px]">
             <div className="flex justify-between items-start">
               <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Рейтинг</p>
               <Star className="w-5 h-5 text-amber-500 fill-current" />
             </div>
             <div>
               <p className="text-4xl font-black italic text-slate-900 tracking-tighter leading-none">
                 {stats?.rating.toFixed(1) || "5.0"}
               </p>
               <p className="text-[9px] font-bold text-amber-600/60 uppercase mt-2 italic">{stats?.reviewsCount || 0} отзывов</p>
             </div>
          </div>

          {/* НАСТРОЙКИ */}
          <Link href="/pro/settings" className="block group">
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white transition-all hover:bg-blue-600 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span className="font-black uppercase italic text-xs tracking-widest">Профиль</span>
               </div>
               <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100" />
            </div>
          </Link>

        </div>

      </div>
    </Container>
  )
}
