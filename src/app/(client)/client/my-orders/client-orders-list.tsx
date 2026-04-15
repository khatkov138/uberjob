"use client"

import * as React from "react"
import { Star, Check, MessageSquare, Zap, ArrowRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"

import { toast } from "sonner"
import Link from "next/link"
import { acceptOffer } from "./actions"

export function ClientOrdersList({ initialOrders }: any) {
  // Состояние для модалки подтверждения
  const [confirmingOffer, setConfirmingOffer] = React.useState<any>(null)

  const mutation = useMutation({
    mutationFn: ({ orderId, offerId, workerId }: any) => acceptOffer(orderId, offerId, workerId),
    onSuccess: () => {
      toast.success("Исполнитель утвержден!")
      setConfirmingOffer(null)
      window.location.reload()
    }
  })

  if (initialOrders.length === 0) return (
    <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
      <p className="text-xl font-black uppercase italic text-slate-300">У вас пока нет активных заказов</p>
    </div>
  )

  return (
    <div className="space-y-12">
      {initialOrders.map((order: any) => (
        <div key={order.id} className="space-y-6">
          
          {/* КАРТОЧКА ЗАКАЗА */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border-2 border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Zap className="w-32 h-32 rotate-12" />
            </div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
               <div className="space-y-1">
                 <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        order.status === 'ACCEPTED' ? "bg-emerald-500" : "bg-blue-600"
                    )} />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        {order.status === 'ACCEPTED' ? 'Исполнитель найден' : 'Ищем исполнителей'}
                    </span>
                 </div>
                 <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">{order.title}</h2>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-black text-slate-300 uppercase">Бюджет</p>
                 <p className="text-2xl font-black italic text-slate-900">{order.price > 0 ? `${order.price / 100} ₽` : 'Договорная'}</p>
               </div>
            </div>
            <p className="text-slate-500 italic font-medium text-lg leading-snug">{order.description}</p>
          </div>

          {/* СПИСОК ПРЕДЛОЖЕНИЙ */}
          <div className="pl-4 md:pl-10 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Предложения ({order.offers.length})
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {order.offers.map((offer: any) => (
              <div 
                key={offer.id}
                className={cn(
                  "bg-white rounded-[2rem] p-6 border-2 transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6",
                  offer.status === 'ACCEPTED' ? "border-blue-600 shadow-xl scale-[1.02]" : "border-slate-50 hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-5 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                    {offer.worker.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black uppercase italic text-slate-900 truncate">{offer.worker.name}</h4>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 text-amber-600 shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px] font-black">{offer.worker.workerProfile?.rating || '5.0'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 italic line-clamp-1">{offer.message || "Готов приступить к работе"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-right mr-auto md:mr-0">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Цена</p>
                    <p className="text-2xl font-black italic text-blue-600">{offer.price / 100} ₽</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* КНОПКА ЧАТА (Доступна всегда) */}
                    <Link 
                        href={`/client/messages/${order.id}?workerId=${offer.workerId}`}
                        className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100 group"
                        title="Написать сообщение"
                    >
                        <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </Link>

                    {offer.status === 'ACCEPTED' ? (
                        <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center gap-2">
                            <Check className="w-4 h-4" /> Выбран
                        </div>
                    ) : order.status === 'PENDING' || order.status === 'SEARCHING' ? (
                        <button 
                            onClick={() => setConfirmingOffer({ orderId: order.id, offerId: offer.id, workerId: offer.workerId, workerName: offer.worker.name })}
                            className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-blue-600 transition-all active:scale-95 whitespace-nowrap"
                        >
                            Выбрать
                        </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* MODAL: ПОДТВЕРЖДЕНИЕ ВЫБОРА */}
      {confirmingOffer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmingOffer(null)} />
            <div className="relative bg-white rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <button 
                    onClick={() => setConfirmingOffer(null)}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="space-y-6 text-center">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto border-2 border-blue-100">
                        <Check className="w-10 h-10 stroke-[3px]" />
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Выбрать исполнителя?</h3>
                        <p className="text-slate-500 font-medium italic">
                            Вы назначаете <span className="text-slate-900 font-bold">{confirmingOffer.workerName}</span> на этот заказ. Остальные предложения будут автоматически отклонены.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate(confirmingOffer)}
                            className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {mutation.isPending ? "Секунду..." : "Да, подтверждаю"}
                        </button>
                        <button
                            onClick={() => setConfirmingOffer(null)}
                            className="w-full h-14 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:text-slate-900 transition-all"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
