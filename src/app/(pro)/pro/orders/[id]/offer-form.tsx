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
    // Оборачиваем в handleAction, переводим рубли в копейки
    mutationFn: (values: CreateOfferValues) =>
      handleAction(createOffer({ ...values, price: values.price * 100 })),
    onSuccess: () => {
      toast.success("ПРЕДЛОЖЕНИЕ ОТПРАВЛЕНО", {
        className: "bg-blue-600 text-white font-black italic uppercase"
      })
      // Обновляем данные заказа, чтобы форма скрылась и появился статус "Вы в деле"
      queryClient.invalidateQueries({ queryKey: ["order-details", orderId] })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  return (
    <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">

      {/* ПРИМЕР С КОНТРОЛЛЕРОМ ДЛЯ ЦЕНЫ */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-4">Ваша цена (₽)</label>
        <Controller
          control={form.control}
          name="price"
          render={({ field, fieldState }) => (
            <>
              <input
                {...field}
                type="number"
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                placeholder="Напр: 500"
                className={cn(
                  "w-full h-16 px-6 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-blue-600 focus:bg-white outline-none text-3xl font-black italic transition-all shadow-inner",
                  fieldState.invalid && "border-red-500 bg-red-50"
                )}
              />
              {fieldState.error && <p className="text-[9px] font-bold text-red-500 ml-4 uppercase italic mt-1">{fieldState.error.message}</p>}
            </>
          )}
        />
      </div>

      {/* СООБЩЕНИЕ */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-4">Сообщение</label>
        <Controller
          control={form.control}
          name="message"
          render={({ field }) => (
            <textarea
              {...field}
              placeholder="Опишите ваш опыт..."
              className="w-full min-h-[120px] p-6 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-blue-600 focus:bg-white outline-none font-bold italic text-slate-600 transition-all resize-none shadow-inner leading-tight"
            />
          )}
        />
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black uppercase italic tracking-widest shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
      >
        {mutation.isPending ? (
          <Loader2 className="animate-spin w-6 h-6" />
        ) : (
          <>
            <span className="text-lg">Отправить отклик</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </>
        )}
      </button>

      <p className="text-[8px] font-bold text-slate-300 uppercase text-center tracking-[0.2em]">
        Нажимая кнопку, вы подтверждаете готовность выполнить работу
      </p>
    </form>
  )
}
