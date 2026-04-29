"use client"

import { Check, MessageSquare } from "lucide-react"
import { OrderByIdResponse } from "@/actions/order/get"

interface OffersListProps {
    // Вытаскиваем тип массива предложений прямо из ответа экшена
    offers: OrderByIdResponse["order"]["offers"]
    orderId: string
}

export function OffersList({ offers }: OffersListProps) {
    if (offers.length === 0) return null

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h3 className="text-[11px] font-black uppercase tracking-widest italic text-slate-400">
                    Предложения ({offers.length})
                </h3>
            </div>

            {offers.map((offer) => (
                <div key={offer.id} className="bg-white border-2 border-slate-100 p-5 rounded-[2rem] hover:border-blue-600 transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black italic uppercase text-xs">
                                {offer.worker.name.charAt(0)}
                            </div>
                            <h4 className="text-sm font-black uppercase italic leading-none">{offer.worker.name}</h4>
                        </div>
                        <p className="text-lg font-black italic text-blue-600 leading-none">
                            {offer.price / 100} ₽
                        </p>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium italic leading-relaxed mb-4 bg-slate-50 p-4 rounded-2xl">
                        {offer.message}
                    </p>
                    <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase italic text-[10px] tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                        <Check className="w-3 h-3" />
                        Выбрать мастера
                    </button>
                </div>
            ))}
        </div>
    )
}
