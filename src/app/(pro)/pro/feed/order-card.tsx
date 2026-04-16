"use client"

import { Card, CardContent } from "@/components/ui/card"
import { 
  Sparkles, Clock, MessageSquare, MapPin, 
  Zap, ChevronRight, Wallet, Banknote 
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

export function OrderCard({ order, userCategories = [], isMatched, toggleCategory }: any) {
  const isNegotiable = order.price === 0
  
  const timeAgo = order.createdAt 
    ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })
    : "недавно"

  return (
    <div className="relative group">
      {/* 1. БЕЙДЖ СМАРТ-ПОДБОРА */}
      {isMatched && (
        <div className="absolute -top-2.5 left-6 md:left-8 z-10 bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wider animate-in fade-in zoom-in duration-300">
          <Sparkles className="w-2.5 h-2.5 fill-current" /> Подходит вам
        </div>
      )}

      <Card className={cn(
        "overflow-hidden border-2 transition-all duration-500 rounded-[2rem] bg-white relative",
        "hover:shadow-[0_15px_45px_rgba(0,0,0,0.05)]",
        isMatched ? "border-blue-500/10 shadow-blue-500/5" : "border-slate-100"
      )}>
        <CardContent className="p-6 md:p-7">
          
          {/* 2. ВЕРХ: ТИТУЛ И ЦЕНА */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-1">
            <div className="space-y-3 flex-1 w-full">
              <Link href={`/pro/feed/orders/${order.id}`} className="block">
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.95]">
                  {order.title}
                </h3>
              </Link>
              
              <div className="flex flex-wrap gap-2">
                {order.categories?.map((cat: string) => (
                  <span
                    key={cat}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest transition-all",
                      userCategories.includes(cat) ? "text-blue-600" : "text-slate-300"
                    )}
                  >
                    #{cat.replace(/\s+/g, '')}
                  </span>
                ))}
              </div>
            </div>

            <div className="md:text-right shrink-0">
              {isNegotiable ? (
                <div className="flex flex-col md:items-end text-emerald-500">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    <span className="text-xl md:text-2xl font-black italic tracking-tighter">ОТКРЫТА</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ПРЕДЛОЖИТЕ ЦЕНУ</span>
                </div>
              ) : (
                <div className="flex flex-col md:items-end">
                  <div className="flex items-center gap-1.5 text-slate-900">
                    <Banknote className="w-4 h-4 text-slate-300" />
                    <span className="text-2xl md:text-3xl font-black italic tracking-tighter">
                      {order.price / 100} ₽
                    </span>
                  </div>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ФИКС. ОПЛАТА</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. ОПИСАНИЕ */}
          <div className="mt-5 mb-6 pl-4 border-l-2 border-slate-100">
            <p className="text-base text-slate-500 font-medium italic lowercase leading-snug line-clamp-2">
              {order.description}
            </p>
          </div>

          {/* 4. МЕТА ТЕГИ */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-lg border border-orange-100 text-orange-500 text-[9px] font-black uppercase italic">
              <Zap className="w-3 h-3 fill-current" /> Срочно
            </div>
            <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-[9px] font-black uppercase">
              ID: {order.id.slice(-6).toUpperCase()}
            </div>
          </div>

          {/* 5. НИЖНИЙ БЛОК */}
          <div className="space-y-5 pt-5 border-t border-slate-50">
            
            {/* Этаж 1: Заказчик */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-md">
                  {order.client?.name?.charAt(0).toUpperCase() || "З"}
                </div>
                <div>
                  <div className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5 tracking-widest">Заказчик</div>
                  <div className="text-sm font-black text-slate-900 tracking-tight">{order.client?.name || "Частное лицо"}</div>
                </div>
              </div>

              <div className="flex gap-6 border-l border-slate-100 pl-6">
                 <div className="text-center">
                    <div className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Проектов</div>
                    <div className="text-sm font-black text-slate-900">{order.client?.projects || 0}</div>
                 </div>
                 <div className="text-center">
                    <div className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Наем</div>
                    <div className="text-sm font-black text-slate-900">{order.client?.hireRate || 0}%</div>
                 </div>
              </div>
            </div>

            {/* Этаж 2: Статистика + Кнопка */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-5 text-slate-400 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Clock className="w-4 h-4 text-slate-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{timeAgo}</span>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <MessageSquare className="w-4 h-4 text-slate-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    ОТКЛИКОВ: {order.offersCount || 0}
                  </span>
                </div>

                {/* ВЫДЕЛЕННЫЙ НАСЕЛЕННЫЙ ПУНКТ */}
                <div className="flex items-center gap-2 min-w-0 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 truncate max-w-[120px] md:max-w-[200px]">
                    {order.address}
                  </span>
                </div>
              </div>

              <Link 
                href={`/pro/feed/orders/${order.id}`}
                className={cn(
                  "flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl md:rounded-2xl text-[11px] font-black uppercase italic tracking-widest transition-all duration-500 w-full lg:w-auto shrink-0 whitespace-nowrap",
                  "bg-slate-100 text-slate-400 border border-slate-200", 
                  "group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 group-hover:shadow-[0_10px_25px_rgba(37,99,235,0.25)] group-hover:-translate-y-0.5 active:scale-[0.98]"
                )}
              >
                <span>Предложить услугу</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0" />
              </Link>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
