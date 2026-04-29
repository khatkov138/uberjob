"use client"

import * as React from "react"
import { Star, Check, MessageSquare, Zap, ArrowUpRight } from "lucide-react"
import { cn, handleAction } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { ClientOrder, getClientOrders } from "@/actions/order/get"
import { ConfirmOfferModal } from "./confirm-offer-modal"


interface ClientOrdersListProps {
  initialOrders: ClientOrder[]
}

export function ClientOrdersList({ initialOrders }: ClientOrdersListProps) {
  // 1. Синхронизируем серверные данные с кэшем React Query
  const { data: orders = [] } = useQuery({
    queryKey: ["client-orders"],
    queryFn: () => handleAction(getClientOrders()),
    initialData: initialOrders,
  })

  // 2. Храним только ID выбранного оффера для открытия модалки
  const [selectedIds, setSelectedIds] = React.useState<{
    orderId: string;
    offerId: string;
  } | null>(null)

  if (orders.length === 0) return (
    <div className="py-24 text-center bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100">
      <p className="text-3xl font-black uppercase italic text-slate-200 tracking-tighter">Активных заказов нет</p>
    </div>
  )

  return (
    <div className="space-y-20 pb-32">
      {orders.map((order) => (
        <div key={order.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* КАРТОЧКА ЗАКАЗА */}
          <div className="bg-white rounded-[3rem] p-10 md:p-12 border-2 border-slate-100 shadow-sm relative overflow-hidden group/order">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-slate-900 group-hover/order:scale-110 group-hover/order:rotate-0 transition-transform duration-700">
              <Zap className="w-48 h-48 rotate-12" />
            </div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    ['ACCEPTED', 'IN_PROGRESS'].includes(order.status) ? "bg-emerald-500" : "bg-blue-600"
                  )} />
                  <span className="text-[12px] font-black uppercase text-slate-400 tracking-[0.2em] italic">
                    {['ACCEPTED', 'IN_PROGRESS'].includes(order.status) ? 'В процессе' : 'Ожидание мастеров'}
                  </span>
                </div>
                <Link href={`/orders/${order.id}`} className="block group/title">
                  <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none group-hover/title:text-blue-600 transition-colors flex items-center gap-3">
                    {order.title}
                    <ArrowUpRight className="w-8 h-8 opacity-0 -translate-y-2 group-hover/title:opacity-100 group-hover/title:translate-y-0 transition-all duration-300" />
                  </h2>
                </Link>
              </div>
              <div className="text-right bg-slate-50 px-6 py-4 rounded-[2rem] border border-slate-100 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Бюджет</p>
                <p className="text-3xl font-black italic text-slate-900 leading-none">
                  {order.price > 0 ? `${order.price / 100} ₽` : 'ДОГОВОРНАЯ'}
                </p>
              </div>
            </div>
            <p className="text-slate-500 italic font-medium text-xl leading-relaxed max-w-3xl line-clamp-2">{order.description}</p>
          </div>

          {/* СПИСОК ПРЕДЛОЖЕНИЙ */}
          <div className="pl-6 md:pl-16 space-y-6 border-l-4 border-slate-50">
            {order.offers.map((offer) => (
              <div key={offer.id} className={cn(
                "bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-8",
                offer.status === 'ACCEPTED' ? "border-blue-600 shadow-2xl scale-[1.03] z-10" : "border-slate-50 hover:border-blue-100 hover:shadow-xl"
              )}>
                <div className="flex items-center gap-6 flex-1 w-full">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white font-black text-3xl shadow-2xl shrink-0">
                    {offer.worker.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-black uppercase italic text-slate-900 truncate tracking-tighter">{offer.worker.name}</h4>
                      <div className="flex items-center gap-1.5 bg-amber-400 text-white px-3 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[11px] font-black">{offer.worker.profile?.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 italic font-semibold border-l-2 border-slate-100 pl-3">{offer.message || "ГОТОВ К РАБОТЕ"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-10 shrink-0 w-full md:w-auto">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Цена</p>
                    <p className="text-3xl font-black italic text-blue-600 leading-none">{offer.price / 100} ₽</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link href={`/chat?userId=${offer.workerId}&orderId=${order.id}`} className="h-16 w-16 bg-slate-50 text-slate-400 rounded-3xl hover:bg-blue-600 hover:text-white transition-all border-2 border-transparent flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </Link>

                    {offer.status === 'ACCEPTED' ? (
                      <div className="bg-emerald-500 text-white px-10 py-5 rounded-3xl font-black uppercase italic text-[11px] flex items-center gap-3 shadow-2xl">
                        <Check className="w-5 h-5" /> ВЫБРАН
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedIds({ orderId: order.id, offerId: offer.id })}
                        className="h-16 px-10 rounded-3xl bg-slate-900 text-white font-black uppercase italic text-[11px] hover:bg-blue-600 transition-all shadow-2xl"
                      >
                        ВЫБРАТЬ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* УМНАЯ МОДАЛКА: Сама найдет данные в кэше по этим ID */}
      <ConfirmOfferModal
        ids={selectedIds}
        onClose={() => setSelectedIds(null)}
      />
    </div>
  )
}
