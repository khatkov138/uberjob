"use client"

import * as React from "react"
import { Star, Check, MessageSquare, Zap, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import { ClientOrder } from "@/actions/order/get"
import { acceptOffer } from "@/actions/order/manage"
import { handleAction } from "@/lib/utils"

interface ClientOrdersListProps {
  initialOrders: ClientOrder[]
}

export function ClientOrdersList({ initialOrders }: ClientOrdersListProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (vars: { orderId: string, offerId: string, workerId: string }) =>
      handleAction(acceptOffer(vars.orderId, vars.offerId, vars.workerId)),
    onSuccess: () => {
      toast.success("ИСПОЛНИТЕЛЬ УТВЕРЖДЕН", {
        className: "bg-blue-600 text-white font-black italic uppercase",
      })
      queryClient.invalidateQueries({ queryKey: ["client-orders"] })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  if (initialOrders.length === 0) return (
    <div className="py-24 text-center bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100">
      <p className="text-3xl font-black uppercase italic text-slate-200 tracking-tighter">Активных заказов нет</p>
    </div>
  )

  return (
    <div className="space-y-20 pb-32">
      {initialOrders.map((order) => (
        <div key={order.id} className="space-y-8">
          
          {/* КАРТОЧКА ЗАКАЗА */}
          <div className="bg-white rounded-[3rem] p-10 md:p-12 border-2 border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-slate-900">
              <Zap className="w-48 h-48 rotate-12" />
            </div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    order.status === 'ACCEPTED' || order.status === 'IN_PROGRESS' ? "bg-emerald-500" : "bg-blue-600"
                  )} />
                  <span className="text-[12px] font-black uppercase text-slate-400 tracking-[0.2em] italic">
                    {order.status === 'ACCEPTED' || order.status === 'IN_PROGRESS' ? 'В процессе' : 'Ожидание мастеров'}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                  {order.title}
                </h2>
              </div>
              <div className="text-right bg-slate-50 px-6 py-4 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Бюджет</p>
                <p className="text-3xl font-black italic text-slate-900 leading-none">
                    {order.price > 0 ? `${order.price / 100} ₽` : 'ДОГОВОРНАЯ'}
                </p>
              </div>
            </div>
            <p className="text-slate-500 italic font-medium text-xl leading-relaxed max-w-3xl">{order.description}</p>
          </div>

          {/* СПИСОК ПРЕДЛОЖЕНИЙ */}
          <div className="pl-6 md:pl-16 space-y-6 border-l-4 border-slate-50">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-300 italic">
                ОТКЛИКИ / {order.offers.length}
              </span>
            </div>

            {order.offers.map((offer) => {
              // Проверяем, грузится ли именно этот оффер через mutation.variables
              const isProcessing = mutation.isPending && mutation.variables?.offerId === offer.id;

              return (
                <div
                  key={offer.id}
                  className={cn(
                    "bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-8",
                    offer.status === 'ACCEPTED' 
                      ? "border-blue-600 shadow-2xl scale-[1.03] z-10" 
                      : "border-slate-50 hover:border-blue-100 hover:shadow-xl"
                  )}
                >
                  <div className="flex items-center gap-6 flex-1 w-full">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white font-black text-3xl shadow-2xl shrink-0 rotate-[-3deg]">
                      {offer.worker.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-black uppercase italic text-slate-900 truncate tracking-tighter">
                          {offer.worker.name}
                        </h4>
                        <div className="flex items-center gap-1.5 bg-amber-400 text-white px-3 py-1 rounded-full shadow-sm">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-[11px] font-black">{offer.worker.profile?.rating?.toFixed(1) || '5.0'}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 italic font-semibold border-l-2 border-slate-100 pl-3">
                        {offer.message || "ГОТОВ ВЫПОЛНИТЬ ЗАДАЧУ КАЧЕСТВЕННО"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 md:gap-10 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-6 md:pt-0">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Предложение</p>
                      <p className="text-3xl font-black italic text-blue-600 leading-none">{offer.price / 100} ₽</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/messages?userId=${offer.workerId}&orderId=${order.id}`}
                        className="h-16 w-16 md:w-auto md:px-8 bg-slate-50 text-slate-400 rounded-3xl hover:bg-blue-600 hover:text-white transition-all border-2 border-transparent flex items-center justify-center gap-3 group active:scale-90"
                      >
                        <MessageSquare className="w-6 h-6" />
                        <span className="text-[11px] font-black uppercase tracking-widest hidden md:inline">ОБСУДИТЬ</span>
                      </Link>

                      {offer.status === 'ACCEPTED' ? (
                        <div className="bg-emerald-500 text-white px-10 py-5 rounded-3xl font-black uppercase italic text-[11px] flex items-center gap-3 shadow-2xl shadow-emerald-200">
                          <Check className="w-5 h-5 stroke-[4]" /> ВЫБРАН
                        </div>
                      ) : (
                        <button
                          disabled={mutation.isPending}
                          onClick={() => {
                            // Если юзер нажал "Выбрать", мы просто запускаем мутацию
                            if (confirm(`Выбрать исполнителем ${offer.worker.name}?`)) {
                                mutation.mutate({
                                    orderId: order.id,
                                    offerId: offer.id,
                                    workerId: offer.workerId
                                })
                            }
                          }}
                          className={cn(
                            "h-16 px-10 rounded-3xl font-black uppercase italic text-[11px] tracking-[0.2em] transition-all active:scale-95 whitespace-nowrap shadow-2xl flex items-center justify-center min-w-[160px]",
                            isProcessing 
                                ? "bg-blue-100 text-blue-600" 
                                : "bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200"
                          )}
                        >
                          {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : "ВЫБРАТЬ"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
