"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Star, CheckCircle2, Loader2, Send, Edit3 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn, handleAction } from "@/lib/utils"
import { leaveReviewAction } from "@/actions/review/create"
import { reviewSchema, type ReviewValues } from "@/lib/validation"
import { Review } from "@prisma/client"

interface ReviewFormProps {
  orderId: string
  // Используем Partial, если нам нужны не все поля, 
  // или просто Pick, если нужны конкретные
  initialData?: Pick<Review, "rating" | "comment"> | null
}
export function ReviewForm({ orderId, initialData }: ReviewFormProps) {
  const queryClient = useQueryClient()
  const [submitted, setSubmitted] = React.useState(false)
  // Если есть initialData — мы в режиме просмотра, если нет — в режиме редактирования
  const [isEditing, setIsEditing] = React.useState(!initialData)

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      orderId,
      rating: initialData?.rating || 5,
      comment: initialData?.comment || "",
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (values: ReviewValues) => handleAction(leaveReviewAction(values)),
    onSuccess: () => {
      setSubmitted(true)
      toast.success("ОТЗЫВ ОБНОВЛЕН", { className: "font-black italic uppercase" })
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      setIsEditing(false) // Возвращаемся в режим просмотра после успеха
    },
    onError: (err: Error) => toast.error(err.message)
  })

  // 1. Экран успеха
  if (submitted) {
    return (
      <div className="bg-emerald-50 border-4 border-emerald-100 rounded-[2.5rem] p-10 text-center animate-in zoom-in duration-500">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-2xl font-black uppercase italic text-emerald-900 tracking-tighter leading-none">Принято!</h3>
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Рейтинг мастера обновлен</p>
        <Button
          variant="link"
          className="mt-4 text-[10px] font-black uppercase text-emerald-700"
          onClick={() => setSubmitted(false)}
        >
          Вернуться к просмотру
        </Button>
      </div>
    )
  }

  // 2. Режим просмотра (ReadOnly)
  if (!isEditing && initialData) {
    return (
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm relative overflow-hidden group">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ваш отзыв</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn("w-5 h-5", s <= initialData.rating ? "fill-amber-400 text-amber-400" : "text-slate-100")} />
              ))}
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(true)}
            className="h-10 px-4 bg-slate-50 text-slate-900 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase italic gap-2"
          >
            <Edit3 className="w-3.5 h-3.5" /> Изменить
          </Button>
        </div>
        <p className="text-xl italic font-semibold text-slate-700 leading-tight">"{initialData.comment}"</p>
      </div>
    )
  }

  // 3. Режим формы (Edit/Create)
  return (
    <form onSubmit={form.handleSubmit((v) => mutate(v))} className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 md:p-10 space-y-8 shadow-sm">
      <header className="text-center space-y-1">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">ZWORK / FEEDBACK</p>
        <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Как все <span className="text-blue-600">прошло?</span></h3>
      </header>

      <div className="space-y-3">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex justify-center">Оценка работы</label>
        <Controller
          control={form.control}
          name="rating"
          render={({ field }) => (
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => field.onChange(star)}
                  className="transition-transform hover:scale-125 active:scale-90"
                >
                  <Star className={cn(
                    "w-12 h-12 transition-colors duration-300",
                    field.value >= star ? "fill-amber-400 text-amber-400" : "text-slate-100"
                  )} />
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-4">Ваш комментарий</label>
        <Controller
          control={form.control}
          name="comment"
          render={({ field, fieldState }) => (
            <>
              <Textarea
                {...field}
                placeholder="Расскажите подробнее о результате..."
                className={cn(
                  "min-h-[120px] px-6 py-4 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white transition-all font-bold italic resize-none leading-tight",
                  fieldState.invalid && "border-red-500 bg-red-50"
                )}
              />
              {fieldState.error && (
                <p className="text-[9px] font-bold text-red-500 ml-4 uppercase italic tracking-widest mt-1">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      <div className="flex gap-3">
        {initialData && (
          <Button
            type="button"
            variant="ghost"
            className="h-16 flex-1 rounded-[2rem] font-black uppercase italic text-slate-400"
            onClick={() => setIsEditing(false)}
          >
            Отмена
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="h-16 flex-[2] rounded-[2rem] bg-slate-900 hover:bg-blue-600 text-white font-black italic uppercase text-lg shadow-xl shadow-slate-200"
        >
          {isPending ? <Loader2 className="animate-spin" /> : "Сохранить"}
        </Button>
      </div>
    </form>
  )
}
