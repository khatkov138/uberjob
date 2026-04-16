"use client"

import { ChevronLeft, MapPin, Clock, ShieldCheck, Zap, User, XCircle } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { OfferForm } from "./offer-form"
import { cn } from "@/lib/utils"

export function OrderDetailsUI({ order, existingOffer, userId }: any) {
  const timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })
  const isOrderClosed = order.status !== "PENDING" && order.status !== "SEARCHING"

  return (
    /**
     * Убрали p-4 md:p-8 и max-w-6xl, так как Container это уже делает.
     * Оставили только вертикальный зазор между блоками space-y-6.
     */
    <div className="w-full space-y-6">
      
      {/* ЛИНИЯ НАВИГАЦИИ — Сделали компактнее */}
      <div className="flex items-center justify-between">
        <Link 
          href="/pro/feed" 
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all group"
        >
          <div className="p-2 bg-white rounded-xl border border-slate-200 group-hover:border-blue-600 transition-all">
            <ChevronLeft className="w-4 h-4 group-hover:text-blue-600" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest italic">Назад</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">Status</p>
             <p className={cn(
               "text-[9px] font-black uppercase italic tracking-tighter",
               isOrderClosed ? "text-slate-400" : "text-blue-600"
             )}>
               {isOrderClosed ? "Order Closed" : "Active Live Order"}
             </p>
          </div>
          <div className={cn(
            "w-8 h-8 rounded-xl border flex items-center justify-center",
            isOrderClosed ? "bg-slate-50 border-slate-100" : "bg-blue-50 border-blue-100"
          )}>
            <Zap className={cn(
              "w-4 h-4 fill-current",
              isOrderClosed ? "text-slate-200" : "text-blue-600 animate-pulse"
            )} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ЛЕВО: ИНФО О ЗАКАЗЕ */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-12 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
              <Zap className="w-64 h-64 rotate-12" />
            </div>

            <div className="relative space-y-8">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {order.categories.map((cat: string) => (
                    <span key={cat} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest italic">
                      #{cat}
                    </span>
                  ))}
                </div>
                <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.85]">
                  {order.title}
                </h1>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Детали</span>
                </div>
                <p className="text-xl md:text-2xl text-slate-500 font-medium italic leading-snug">
                  {order.description}
                </p>
              </div>

              <div className="pt-8 border-t border-slate-50 flex flex-wrap gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Создан</p>
                    <p className="text-md font-black text-slate-900 italic uppercase">{timeAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Локация</p>
                    <p className="text-md font-black text-slate-900 italic uppercase">{order.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ПРАВО: СТЕК ДЕЙСТВИЙ */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* ЗАКАЗЧИК */}
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-black italic shrink-0">
                  {order.client.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5">Заказчик</p>
                  <h3 className="text-lg font-black tracking-tighter truncate uppercase italic leading-none">{order.client.name}</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                <div>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-0.5">Проектов</p>
                  <p className="text-xl font-black italic text-blue-500">{order.client._count.ordersCreated}</p>
                </div>
                <div>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-0.5">Откликов</p>
                  <p className="text-xl font-black italic text-white">{order._count.offers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ФОРМА */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm transition-all">
            {existingOffer ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black uppercase italic text-md text-slate-900 tracking-tighter">Вы в деле!</h4>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Предложение отправлено</p>
                </div>
                <Link href="/pro/my-offers" className="block text-[9px] font-black text-blue-600 uppercase border-b border-blue-100 hover:border-blue-600 transition-all w-fit mx-auto">
                  Смотреть отклики
                </Link>
              </div>
            ) : isOrderClosed ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-black uppercase italic text-md text-slate-400 tracking-tighter">Закрыто</h4>
                  <p className="text-[8px] text-slate-300 uppercase font-black tracking-widest">Исполнитель выбран</p>
                </div>
              </div>
            ) : (
              <OfferForm orderId={order.id} defaultPrice={order.price} />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
