"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"

import { toast } from "sonner"
import { Loader2, ArrowRight } from "lucide-react"
import { createOffer } from "./actions"

export function OfferForm({ orderId, defaultPrice }: { orderId: string, defaultPrice: number }) {
  const [price, setPrice] = React.useState(defaultPrice > 0 ? (defaultPrice / 100).toString() : "")
  const [comment, setComment] = React.useState("")

  const mutation = useMutation({
    mutationFn: () => createOffer({ orderId, price: Number(price) * 100, message: comment }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Ваше предложение отправлено!")
        window.location.reload()
      } else {
        toast.error(res.error)
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ваша цена (₽)</label>
        <input 
          type="number"
          placeholder="Напр: 500"
          className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 outline-none text-2xl font-black italic transition-all"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Сообщение (необязательно)</label>
        <textarea 
          placeholder="Опишите ваш опыт или уточните детали..."
          className="w-full min-h-[120px] p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 outline-none font-medium text-slate-600 transition-all resize-none"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <button
        disabled={!price || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {mutation.isPending ? <Loader2 className="animate-spin" /> : <>Сделать предложение <ArrowRight className="w-5 h-5" /></>}
      </button>
    </div>
  )
}
