"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, ArrowRight } from "lucide-react"

import { handleAction, cn } from "@/lib/utils"
import { createOfferSchema, type CreateOfferValues } from "@/lib/validation"
import { createOffer } from "@/actions/offer/create"

export function OfferForm({ orderId, defaultPrice }: { orderId: string, defaultPrice: number }) {
  const queryClient = useQueryClient()

  const form = useForm<CreateOfferValues>({
    resolver: zodResolver(createOfferSchema),
    defaultValues: {
      orderId,
      price: defaultPrice > 0 ? defaultPrice / 100 : 0,
      message: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CreateOfferValues) =>
      handleAction(createOffer({ ...values, price: values.price * 100 })),
    onSuccess: () => {
      toast.success("ОТКЛИК ОТПРАВЛЕН", {
        className: "bg-blue-600 text-white font-black italic uppercase rounded-2xl border-none shadow-2xl"
      })
      queryClient.invalidateQueries({ queryKey: ["order-details", orderId] })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  return (
    <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      {/* ЦЕНА */}
      <div className="space-y-2">
        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 ml-4">
          Цена предложения (₽)
        </label>
        <Controller
          control={form.control}
          name="price"
          render={({ field, fieldState }) => (
            <div className="relative group">
              <input
                {...field}
                type="number"
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                placeholder="0"
                className={cn(
                  "w-full h-20 px-8 bg-slate-50 border border-slate-100 rounded-[2rem] text-4xl font-black italic text-slate-900 outline-none transition-all focus:bg-white focus:border-blue-600 focus:shadow-xl focus:shadow-blue-50",
                  fieldState.invalid && "border-red-500 bg-red-50"
                )}
              />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-200 font-black italic text-2xl group-focus-within:text-blue-600 transition-colors">
                ₽
              </div>
            </div>
          )}
        />
      </div>

      {/* СООБЩЕНИЕ */}
      <div className="space-y-2">
        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 ml-4">
          Детали работы
        </label>
        <Controller
          control={form.control}
          name="message"
          render={({ field }) => (
            <textarea
              {...field}
              placeholder="Опишите ваш опыт и сроки..."
              className="w-full min-h-[160px] p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] font-bold italic text-slate-700 outline-none transition-all focus:bg-white focus:border-blue-600 focus:shadow-xl focus:shadow-blue-50 resize-none leading-tight"
            />
          )}
        />
      </div>

      {/* КНОПКА ОТПРАВКИ */}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="group w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black uppercase italic tracking-widest text-xs transition-all hover:bg-blue-600 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
      >
        {mutation.isPending ? (
          <Loader2 className="animate-spin w-6 h-6" />
        ) : (
          <>
            <span>Предложить услугу</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </>
        )}
      </button>

      <p className="text-[8px] font-bold text-slate-300 uppercase text-center tracking-[0.2em] italic">
        Нажимая кнопку, вы подтверждаете <br /> готовность выполнить работу
      </p>
    </form>
  )
}
