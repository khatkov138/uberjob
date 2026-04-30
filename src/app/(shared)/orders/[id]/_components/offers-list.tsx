"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageSquare, Star, ShieldCheck, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { cn, handleAction } from "@/lib/utils"
import { type OrderByIdResponse } from "@/actions/order/get"
import { ConfirmOfferModal } from "./confirm-offer-modal"
import { acceptOffer } from "@/actions/offer/manage"

interface OffersListProps {
  order: OrderByIdResponse["order"]
}

export function OffersList({ order }: OffersListProps) {
  const queryClient = useQueryClient()
  const [targetOffer, setTargetOffer] = React.useState<{ id: string, name: string } | null>(null)

  const isOrderClosed = order.status !== "PENDING" && order.status !== "SEARCHING"
  const orderId = order.id
  const orderWorkerId = order.workerId

  const { mutate: handleAccept, isPending } = useMutation({
    mutationFn: (offerId: string) => handleAction(acceptOffer(orderId, offerId)),
    onSuccess: () => {
      toast.success("МАСТЕР НАЗНАЧЕН", {
        className: "bg-slate-900 text-white font-black italic uppercase rounded-2xl"
      })
      queryClient.invalidateQueries({ queryKey: ["order-details", orderId] })
      setTargetOffer(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setTargetOffer(null)
    }
  })

  if (!order.offers || order.offers.length === 0) return null

  return (
    <div className="grid gap-8">
      {order.offers.map((offer) => {
        const isThisMasterSelected = offer.workerId === orderWorkerId

        return (
          <div
            key={offer.id}
            className={cn(
              "group bg-white border border-slate-100 rounded-[2.5rem] p-10 transition-all duration-500",
              !isOrderClosed && "hover:shadow-2xl hover:shadow-blue-100/30 hover:-translate-y-1",
              isThisMasterSelected && "ring-4 ring-blue-600/10 bg-blue-50/20 border-blue-100"
            )}
          >
            {/* ВЕРХНЯЯ ЧАСТЬ: ПРОФИЛЬ И ЦЕНА */}
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black italic uppercase text-2xl shadow-xl shadow-slate-200">
                  {offer.worker.name.charAt(0)}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black uppercase italic leading-none text-slate-900 tracking-tighter">
                    {offer.worker.name}
                  </h4>
                  <div className="flex items-center gap-1.5 bg-amber-50 w-fit px-2 py-0.5 rounded-lg border border-amber-100">
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                    <span className="text-[10px] font-black text-amber-600 uppercase">5.0</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Предложил</p>
                <p className="text-4xl font-black italic text-blue-600 tracking-tighter leading-none">
                  {(offer.price / 100).toLocaleString()} <span className="text-lg">₽</span>
                </p>
              </div>
            </div>

            {/* СООБЩЕНИЕ */}
            <div className="bg-slate-50/50 rounded-[2rem] p-8 mb-10 border border-slate-50/50 group-hover:bg-white transition-colors">
              <p className={cn(
                "text-sm font-medium italic leading-relaxed",
                offer.message ? "text-slate-600" : "text-slate-300 uppercase tracking-[0.2em] text-[10px] font-black text-center"
              )}>
                {offer.message || "Мастер готов обсудить детали в чате"}
              </p>
            </div>

            {/* КНОПКИ ДЕЙСТВИЯ */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Левая часть: кнопка выбора или статус */}
              <div className={cn(
                "transition-all duration-500 overflow-hidden",
                isOrderClosed && !isThisMasterSelected ? "w-0 opacity-0" : "flex-[2.5]"
              )}>
                {isThisMasterSelected ? (
                  <div className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase italic text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-blue-200">
                    <ShieldCheck className="w-5 h-5" />
                    Мастер выбран
                  </div>
                ) : (
                  <button
                    onClick={() => setTargetOffer({ id: offer.id, name: offer.worker.name })}
                    disabled={isPending}
                    className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-[11px] tracking-[0.2em] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <Check className="w-4 h-4" />
                        Выбрать мастера
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Правая часть: Чат (всегда доступен) */}
              <Link
                href={`/chat?userId=${offer.workerId}`}
                className={cn(
                  "h-16 bg-white border border-slate-100 rounded-2xl font-black uppercase italic text-[11px] tracking-[0.2em] text-slate-400 hover:text-blue-600 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-50 transition-all flex items-center justify-center gap-3",
                  isOrderClosed && !isThisMasterSelected ? "w-full" : "flex-1"
                )}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Чат</span>
              </Link>
            </div>
          </div>
        )
      })}

      <ConfirmOfferModal
        isOpen={!!targetOffer}
        isLoading={isPending}
        workerName={targetOffer?.name}
        onClose={() => setTargetOffer(null)}
        onConfirm={() => targetOffer && handleAccept(targetOffer.id)}
      />
    </div>
  )
}
