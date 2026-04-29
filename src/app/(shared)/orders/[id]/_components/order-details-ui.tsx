"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, MapPin, Clock, Zap, Banknote, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { cn, handleAction } from "@/lib/utils"
import { getOrderById, type OrderByIdResponse } from "@/actions/order/get"
import { OffersList } from "./offers-list"

interface OrderDetailsUIProps {
  orderId: string
  initialData: OrderByIdResponse
  context: {
    userId: string | null
    isOwner: boolean
    isAssignedWorker: boolean
  }
}

export function OrderDetailsUI({ orderId, initialData, context }: OrderDetailsUIProps) {
  const { data } = useQuery({
    queryKey: ["order-details", orderId],
    queryFn: async () => await handleAction(getOrderById(orderId)),
    initialData: initialData,
    staleTime: 1000 * 60 * 5,
  })

  const currentData = data ?? initialData
  const { order: currentOrder, existingOffer: hasOffer } = currentData

  const timeAgo = React.useMemo(() =>
    formatDistanceToNow(new Date(currentOrder.createdAt), { addSuffix: true, locale: ru }),
    [currentOrder.createdAt]
  )

  const isOrderClosed = currentOrder.status !== "PENDING" && currentOrder.status !== "SEARCHING"

  // Динамическая ссылка "Назад"
  const backHref = context.isOwner ? "/orders" : "/pro/orders"

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* НАВИГАЦИЯ */}
      <div className="flex items-center justify-between">
        <Link
          href={backHref}
          className="flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all group"
        >
          <div className="p-2.5 bg-white rounded-2xl border border-slate-200 group-hover:border-blue-600 group-hover:shadow-lg group-hover:shadow-blue-50 transition-all">
            <ChevronLeft className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Назад в ленту</span>
        </Link>

        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-right hidden sm:block">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] leading-none mb-1">Статус</p>
            <p className={cn(
              "text-[10px] font-black uppercase italic tracking-tighter",
              isOrderClosed ? "text-slate-400" : "text-blue-600"
            )}>
              {isOrderClosed ? "Завершен / В работе" : "Открыт для предложений"}
            </p>
          </div>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            isOrderClosed ? "bg-slate-50 text-slate-200" : "bg-blue-50 text-blue-600 ring-4 ring-blue-50/50"
          )}>
            <Zap className={cn("w-5 h-5 fill-current", !isOrderClosed && "animate-pulse")} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ЛЕВО: ДЕТАЛИ (ОБЩИЕ) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[3.5rem] p-8 md:p-14 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
              <Zap className="w-64 h-64 rotate-12" />
            </div>

            <div className="relative space-y-10">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {currentOrder.categories.map((catObj) => (
                    <span key={catObj.categoryId} className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest italic">
                      #{catObj.category.name}
                    </span>
                  ))}
                </div>
                <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8] py-2">
                  {currentOrder.title}
                </h1>
              </div>

              <div className="flex items-center gap-4 py-5 px-8 bg-blue-50/50 border border-blue-100 rounded-[2rem] w-fit shadow-inner">
                <Banknote className="w-8 h-8 text-blue-600" />
                <span className="text-4xl font-black italic text-slate-900 tracking-tighter">
                  {currentOrder.price > 0 ? `${Math.floor(currentOrder.price / 100)} ₽` : "ДОГОВОРНАЯ"}
                </span>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3 text-blue-600">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                  <span className="text-[12px] font-black uppercase tracking-[0.3em] italic">Техническое задание</span>
                </div>
                <p className="text-2xl md:text-3xl text-slate-600 font-medium italic leading-[1.1] tracking-tight">
                  {currentOrder.description}
                </p>
              </div>

              <div className="pt-10 border-t-2 border-dashed border-slate-100 flex flex-wrap gap-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[1.2rem] bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Опубликован</p>
                    <p className="text-lg font-black text-slate-900 italic uppercase leading-none">{timeAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[1.2rem] bg-blue-50 flex items-center justify-center text-blue-400 border border-blue-100">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Адрес работы</p>
                    <p className="text-lg font-black text-slate-900 italic uppercase leading-none">{currentOrder.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ПРАВО: КОНТЕКСТНАЯ ЛОГИКА */}
        <div className="lg:col-span-4 space-y-6">

          {/* 1. ЕСЛИ ГОСТЬ */}
          {!context.userId && (
            <div className="bg-white rounded-[3rem] p-10 border-4 border-black shadow-[12px_12px_0px_0px_rgba(37,99,235,1)] text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto rotate-3">
                <Zap className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black italic uppercase text-2xl tracking-tighter leading-none">
                  Хотите <span className="text-blue-600">откликнуться?</span>
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Только авторизованные мастера <br /> могут предлагать услуги
                </p>
              </div>
              <Link href="/sign-in" className="block w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest hover:bg-blue-600 transition-all active:scale-95">
                Войти в систему
              </Link>
            </div>
          )}

          {/* 2. ЕСЛИ ВЛАДЕЛЕЦ (КЛИЕНТ) */}
          {context.isOwner && (
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-xl">
                <h3 className="text-[11px] font-black uppercase tracking-widest italic mb-6">Управление</h3>
                <button className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest">
                  Редактировать заказ
                </button>
              </div>
              <OffersList offers={currentOrder.offers || []} orderId={orderId} />
            </div>
          )}

          {/* 3. ЕСЛИ МАСТЕР (PRO) */}
          {context.userId && !context.isOwner && (
            <>
              <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-2xl font-black italic shrink-0 overflow-hidden shadow-xl rotate-[-3deg]">
                      {currentOrder.client.image ? (
                        <img src={currentOrder.client.image} className="w-full h-full object-cover" alt="Avatar" />
                      ) : currentOrder.client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Клиент</p>
                      <h3 className="text-2xl font-black tracking-tighter truncate uppercase italic leading-none">{currentOrder.client.name}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 py-6 border-y border-white/10">
                    <div>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Заказов</p>
                      <p className="text-3xl font-black italic text-blue-500 leading-none">{currentOrder.client._count?.ordersCreated || 0}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Откликов</p>
                      <p className="text-3xl font-black italic text-white leading-none">{currentOrder._count?.offers || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-xl">
                {hasOffer ? (
                  <div className="text-center py-8 space-y-5 animate-in zoom-in">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-[1.5rem] flex items-center justify-center mx-auto border-2 border-emerald-100 rotate-12">
                      <ShieldCheck className="w-8 h-8 fill-current" />
                    </div>
                    <h4 className="font-black uppercase italic text-xl text-slate-900 tracking-tighter leading-none">ОТКЛИК ОТПРАВЛЕН</h4>
                  </div>
                ) : isOrderClosed ? (
                  <div className="text-center py-8 opacity-50">
                    <p className="font-black uppercase italic text-slate-400">Набор закрыт</p>
                  </div>
                ) : (
                  <>offerform</> /* <OfferForm orderId={currentOrder.id} defaultPrice={currentOrder.price} />*/
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
