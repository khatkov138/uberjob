"use client"

import { ChevronLeft, MapPin, Clock, ShieldCheck, Zap, User, XCircle } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { OfferForm } from "./offer-form"
import { cn } from "@/lib/utils"

export function OrderDetailsUI({ order, existingOffer, userId }: any) {
  const timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })
  
  // Проверяем, открыт ли еще заказ для новых предложений
  const isOrderClosed = order.status !== "PENDING" && order.status !== "SEARCHING"

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      
      {/* ЛИНИЯ НАВИГАЦИИ */}
      <div className="flex items-center justify-between">
        <Link 
          href="/pro/feed" 
          className="flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all group"
        >
          <div className="p-2.5 bg-white rounded-2xl border-2 border-slate-100 group-hover:border-blue-600 shadow-sm transition-all">
            <ChevronLeft className="w-5 h-5 group-hover:text-blue-600" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Назад к ленте</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Status</p>
             <p className={cn(
               "text-[10px] font-black uppercase italic",
               isOrderClosed ? "text-slate-400" : "text-blue-600"
             )}>
               {isOrderClosed ? "Order Closed" : "Active Live Order"}
             </p>
          </div>
          <div className={cn(
            "w-10 h-10 rounded-2xl border-2 flex items-center justify-center",
            isOrderClosed ? "bg-slate-50 border-slate-100" : "bg-blue-50 border-blue-100"
          )}>
            <Zap className={cn(
              "w-5 h-5 fill-current",
              isOrderClosed ? "text-slate-300" : "text-blue-600 animate-pulse"
            )} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ЛЕВО: ИНФО О ЗАКАЗЕ */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[3.5rem] p-8 md:p-14 border-2 border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <Zap className="w-64 h-64 rotate-12" />
            </div>

            <div className="relative space-y-10">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {order.categories.map((cat: string) => (
                    <span key={cat} className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest italic">
                      #{cat}
                    </span>
                  ))}
                </div>
                <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
                  {order.title}
                </h1>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 text-blue-600">
                  <ShieldCheck className="w-6 h-6" />
                  <span className="text-[12px] font-black uppercase tracking-[0.3em]">Детали задачи</span>
                </div>
                <p className="text-xl md:text-3xl text-slate-500 font-medium italic leading-tight first-letter:uppercase">
                  {order.description}
                </p>
              </div>

              <div className="pt-10 border-t-2 border-slate-50 flex flex-wrap gap-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Опубликован</p>
                    <p className="text-lg font-black text-slate-900 italic uppercase">{timeAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Локация</p>
                    <p className="text-lg font-black text-slate-900 italic uppercase">{order.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ПРАВО: СТЕК ДЕЙСТВИЙ */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.2rem] bg-blue-600 flex items-center justify-center text-3xl font-black italic shadow-inner shrink-0">
                  {order.client.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Заказчик</p>
                  <h3 className="text-2xl font-black tracking-tighter truncate leading-none uppercase italic">{order.client.name}</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 py-6 border-y border-white/10">
                <div>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Проектов</p>
                  <p className="text-2xl font-black italic text-blue-500">{order.client._count.ordersCreated}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Откликов</p>
                  <p className="text-2xl font-black italic text-white">{order._count.offers}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest italic">
                <User className="w-3 h-3" /> На ZWORK с 2024
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-sm transition-all hover:border-blue-600/20">
            {/* 1. Если пользователь уже отправил отклик */}
            {existingOffer ? (
              <div className="text-center py-10 space-y-5">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto border-2 border-emerald-100">
                  <Zap className="w-8 h-8 fill-current" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black uppercase italic text-lg text-slate-900">Вы в деле!</h4>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Ваше предложение отправлено</p>
                </div>
                <Link href="/pro/my-offers" className="block text-[10px] font-black text-blue-600 uppercase border-b-2 border-blue-100 hover:border-blue-600 transition-all w-fit mx-auto pb-1">
                  Смотреть мои отклики
                </Link>
              </div>
            ) : isOrderClosed ? (
              /* 2. Если заказ закрыт (исполнитель выбран) */
              <div className="text-center py-10 space-y-5">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto border-2 border-slate-100">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black uppercase italic text-lg text-slate-400">Набор закрыт</h4>
                  <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest leading-tight">
                    Исполнитель для этого заказа <br /> уже выбран клиентом
                  </p>
                </div>
                <Link href="/pro/feed" className="block text-[10px] font-black text-blue-600 uppercase border-b-2 border-blue-100 hover:border-blue-600 transition-all w-fit mx-auto pb-1">
                  Вернуться в ленту
                </Link>
              </div>
            ) : (
              /* 3. Если заказ открыт — показываем форму */
              <OfferForm orderId={order.id} defaultPrice={order.price} />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
