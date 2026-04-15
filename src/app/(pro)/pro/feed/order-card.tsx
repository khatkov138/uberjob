"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Check, Plus, X, Wallet, MapPin, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { OrderStatusCard } from "@/components/dashboard/order-status-card"

interface OrderCardProps {
  order: any
  userCategories: string[] // Список категорий мастера для сравнения
  isMatched: boolean // Общий статус "подходит"
  toggleCategory: (category: string) => void
}

export function OrderCard({ order, userCategories, isMatched, toggleCategory }: OrderCardProps) {
  const isNegotiable = order.price === 0

  return (
    <div className="relative group">
      {/* Бейдж "Для вас" (показывается, если совпала хотя бы одна категория) */}
      {isMatched && (
        <div className="absolute -top-3 left-8 z-10 bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 uppercase tracking-tighter animate-in fade-in zoom-in duration-300">
          <Sparkles className="w-3 h-3 fill-current" /> Для вас
        </div>
      )}

      <Card className={cn(
        "overflow-hidden border-2 transition-all duration-500 rounded-[2.5rem]",
        isMatched ? "border-blue-500/30 shadow-xl bg-white" : "border-transparent opacity-90 hover:opacity-100"
      )}>
        <CardContent className="p-8">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
            
            {/* СПИСОК ТЕГОВ КАТЕГОРИЙ */}
            <div className="flex flex-wrap gap-2 max-w-[70%]">
              {order.categories?.map((cat: string) => {
                const hasSkill = userCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleCategory(cat);
                    }}
                    className={cn(
                      "group/tag flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95",
                      hasSkill 
                        ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                        : "bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                    )}
                  >
                    <div className="relative w-3 h-3 flex items-center justify-center">
                      {hasSkill ? (
                        <>
                          <Check className="w-3 h-3 group-hover/tag:opacity-0 transition-opacity" />
                          <X className="w-3 h-3 absolute inset-0 opacity-0 group-hover/tag:opacity-100 text-red-500 transition-opacity" />
                        </>
                      ) : (
                        <Plus className="w-3 h-3 group-hover/tag:scale-125 transition-transform" />
                      )}
                    </div>
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Бюджет */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all shadow-sm shrink-0",
              isNegotiable ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-slate-900 border-slate-900 text-white"
            )}>
              {isNegotiable ? (
                <span className="text-[10px] font-black uppercase tracking-tighter italic">Цена договорная</span>
              ) : (
                <div className="flex items-center gap-1">
                  <Wallet className="w-3 h-3 opacity-70" />
                  <span className="text-sm font-black italic">{order.price / 100} ₽</span>
                </div>
              )}
            </div>
          </div>

          {/* Основной контент */}
          <Link href={`/pro/orders/${order.id}`}>
            <OrderStatusCard order={order} showPrice={false} />
          </Link>
          
          {/* ФУТЕР: ЛОКАЦИЯ И ДИСТАНЦИЯ */}
          <div className="mt-6 pt-6 border-t flex items-center justify-between">
            <div className={cn(
              "flex items-center gap-2 font-black px-4 py-2 rounded-full text-[10px] transition-all uppercase tracking-tight",
              isMatched ? "bg-blue-600 text-white shadow-md" : "bg-slate-100 text-slate-600"
            )}>
              <MapPin className="w-3.5 h-3.5" />
              <span>{order.address}</span> 
              <span className="opacity-30">/</span>
              <span>{order.distance ? `${order.distance.toFixed(1)} км` : "Рядом"}</span>
            </div>

            <Link 
              href={`/pro/orders/${order.id}`} 
              className="font-bold text-[10px] flex items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              Подробнее <Navigation className="w-3.5 h-3.5 rotate-90" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
