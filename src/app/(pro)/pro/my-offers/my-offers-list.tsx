"use client"

import { Clock, MapPin, ChevronRight, CheckCircle2, XCircle, Timer, User } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

export function MyOffersList({ initialOffers }: any) {
  if (!initialOffers || initialOffers.length === 0) {
    return (
      <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
        <p className="text-xl font-black uppercase italic text-slate-300 text-slate-500">У вас пока нет активных откликов</p>
        <Link href="/pro/feed" className="inline-block mt-6 text-blue-600 font-black uppercase text-xs border-b-2 border-blue-100 pb-1">
          Перейти в ленту заказов
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {initialOffers.map((offer: any) => (
        <div key={offer.id} className="group relative">
          <div className={cn(
            "bg-white rounded-[2.5rem] border-2 transition-all duration-500 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8",
            "hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)]",
            offer.status === 'ACCEPTED' ? "border-emerald-500/20 bg-emerald-50/10" : "border-slate-100"
          )}>
            
            {/* ИНФО О ЗАКАЗЕ */}
            <div className="flex-1 space-y-5 w-full">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                  #{offer.order.categories[0]}
                </span>
                <span className="text-[9px] font-black uppercase text-slate-300">
                  REF: {offer.id.slice(-6).toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-1">
                <Link href={`/pro/orders/${offer.order.id}`}>
                  <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900 group-hover:text-blue-600 transition-colors leading-[0.9]">
                    {offer.order.title}
                  </h3>
                </Link>
                
                {/* БЛОК ЗАКАЗЧИКА */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                    {offer.order.client?.image ? (
                      <img src={offer.order.client.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 italic">
                    Заказчик: <span className="text-slate-600">{offer.order.client?.name || "Аноним"}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-slate-400 pt-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase italic text-slate-500">{offer.order.address}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">
                    {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true, locale: ru })}
                  </span>
                </div>
              </div>
            </div>

            {/* ВАША ЦЕНА И СТАТУС */}
            <div className="flex items-center gap-8 shrink-0 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-10">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Ваша цена</p>
                <p className="text-4xl font-black italic text-slate-900 leading-none tracking-tighter">
                  {offer.price / 100} <span className="text-lg uppercase text-slate-300">₽</span>
                </p>
              </div>

              <div className="ml-auto md:ml-0">
                {offer.status === 'PENDING' && (
                  <div className="flex flex-col items-center gap-1 text-orange-400 bg-orange-50 px-5 py-3 rounded-3xl border border-orange-100 shadow-sm shadow-orange-100/50">
                    <Timer className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Рассматривают</span>
                  </div>
                )}
                {offer.status === 'ACCEPTED' && (
                  <div className="flex flex-col items-center gap-1 text-emerald-500 bg-emerald-50 px-5 py-3 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-100/50">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Вы выбраны!</span>
                  </div>
                )}
                {offer.status === 'REJECTED' && (
                  <div className="flex flex-col items-center gap-1 text-slate-400 bg-slate-50 px-5 py-3 rounded-3xl border border-slate-100">
                    <XCircle className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase">Отклонено</span>
                  </div>
                )}
              </div>
            </div>

            {/* ПЕРЕХОД */}
            <Link 
              href={`/pro/feed/orders/${offer.order.id}`}
              className="absolute top-1/2 -right-4 -translate-y-1/2 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:right-6 transition-all duration-500 shadow-xl z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
