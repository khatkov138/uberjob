"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, MapPin, Clock, Zap, Banknote, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { cn, handleAction } from "@/lib/utils"
import { getOrderByIdOrSlug, type OrderByIdResponse } from "@/actions/order/get"
import { OffersList } from "./offers-list"
import { OfferForm } from "./offer-form"

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
  // Подключаем TanStack Query: берем initialData с сервера и вешаем на ключ
  const { data } = useQuery({
    queryKey: ["order-details", orderId],
    queryFn: async () => await handleAction(getOrderByIdOrSlug(orderId)),
    initialData, // Гидратация: юзер видит данные сразу, без лоадера
    staleTime: 1000 * 60 * 5, // 5 минут считаем данные свежими
  })

  // Работаем теперь только через data (которая синхронизирована с кешем)
  const { order, existingOffer: hasOffer } = data
  const isOrderOpen = order.status === "PENDING" || order.status === "SEARCHING"

  const timeAgo = React.useMemo(() =>
    formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru }),
    [order.createdAt]
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 w-full animate-in fade-in duration-700">

      {/* HEADER */}
      <header className="col-span-12 flex items-center justify-between mb-2">
        <Link href={context.isOwner ? "/client/orders" : "/pro/orders"} className="group flex items-center gap-3">
          <div className="p-3 bg-white border border-slate-100 rounded-2xl group-hover:border-blue-600 transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-[0.3em] text-slate-400">Назад в ленту</span>
        </Link>
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full", isOrderOpen ? "bg-blue-600 animate-pulse" : "bg-slate-200")} />
          <span className="text-[10px] font-black uppercase italic text-slate-400">
            {isOrderOpen ? "В поиске" : "В работе"}
          </span>
        </div>
      </header>

      {/* ЛЕВО: КОНТЕНТ (8 колонок) */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
          <Zap className="absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 opacity-[0.03] text-slate-900 pointer-events-none rotate-12" />

          <div className="relative space-y-10">
            <div className="space-y-4">
              <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest italic">
                #{order.categories?.[0]?.category?.name || 'КАТЕГОРИЯ'}
              </span>
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.9]">
                {order.title}
              </h1>
            </div>

            {/* Бюджет (Blue Card Style) */}
            <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-100 flex items-center gap-6 w-fit">
              <Banknote className="w-8 h-8 opacity-50" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Бюджет заказа</p>
                <p className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none">
                  {order.price > 0 ? `${(order.price / 100).toLocaleString()} ₽` : "ДОГОВОРНАЯ"}
                </p>
              </div>
            </div>

            {/* Описание */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-4">
                <span className="text-[11px] font-black uppercase italic text-slate-900">Описание задачи</span>
              </div>
              <p className="text-2xl md:text-3xl text-slate-600 font-medium italic leading-tight tracking-tight">
                {order.description}
              </p>
            </div>

            {/* Подвал */}
            <div className="flex flex-wrap gap-10 pt-8 border-t border-slate-50">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-300" />
                <p className="text-[11px] font-black text-slate-300 uppercase italic">{timeAgo}</p>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">adress</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ПРАВО: САЙДБАР (4 колонки) */}
      <div className="lg:col-span-4 space-y-6">

        {/* Состояние мастера: Форма или сообщение об успехе */}
        {!context.isOwner && context.userId && hasOffer && (
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-blue-100 rounded-3xl animate-ping opacity-20" />
                <div className="relative w-full h-full bg-blue-50 rounded-3xl flex items-center justify-center">
                  <ShieldCheck className="w-10 h-10 text-blue-600" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                  Вы в деле!
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
                  Ваше предложение на рассмотрении
                </p>
              </div>
            </div>

            {/* ССЫЛКА НА МОИ ПРЕДЛОЖЕНИЯ */}
            <Link
              href="/pro/offers"
              className="group flex items-center justify-between w-full p-5 bg-slate-50 hover:bg-blue-600 rounded-[1.5rem] transition-all duration-300 border border-slate-100 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-100"
            >
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-black text-slate-300 group-hover:text-blue-200 uppercase tracking-widest leading-none mb-1">
                  Перейти в хаб
                </span>
                <span className="text-[11px] font-black uppercase italic text-slate-900 group-hover:text-white transition-colors">
                  Мои отклики
                </span>
              </div>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5 text-blue-600" />
              </div>
            </Link>
          </div>
        )}

        {/* Список предложений для владельца */}
        {context.isOwner && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            {/* Заголовок в стиле Dashboard: плотный и с синим акцентом */}
            <div className="flex items-center gap-3 px-1">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter">
                Предложения <span className="text-blue-600">({order.offers?.length || 0})</span>
              </h3>
            </div>

            {/* Прокидываем orderId и флаг закрытия заказа */}
            <OffersList order={order} />

          </div>
        )}
      </div>
    </div>
  )
}
