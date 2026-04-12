"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leaveReviewAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, Send, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Review } from "../../../../../../prisma/generated"


interface ReviewFormProps {
  orderId: string
  profileId: string
  initialData?: Review | null // Теперь здесь все поля из БД: id, rating, comment и т.д.
}

export function ReviewForm({ orderId, profileId, initialData }: ReviewFormProps) {

  const [submitted, setSubmitted] = useState(false) // Состояние для интерактива
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(!initialData)
  const [rating, setRating] = useState(initialData?.rating || 5)
  const [comment, setComment] = useState(initialData?.comment || "")

  const { mutate, isPending } = useMutation({
    mutationFn: leaveReviewAction,
    onSuccess: (res) => {
      if (res.success) {
        setSubmitted(true) // Показываем экран "Спасибо"
        toast.success("Отзыв принят!")
        queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      } else {
        toast.error(res.error)
      }
    }
  })

  // Если отзыв уже отправлен, показываем "Success State"
  if (submitted) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-green-800">Спасибо за ваш отзыв!</h3>
        <p className="text-green-600 text-sm mt-2">Вы помогаете нашему сообществу становиться лучше.</p>
      </div>
    )
  }

  // Режим просмотра оставленного отзыва
  if (!isEditing && initialData) {
    return (
      <div className="bg-blue-50/50 border rounded-3xl p-6 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={cn("w-5 h-5", s <= initialData.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Изменить</Button>
        </div>
        <p className="text-sm italic text-slate-600">"{initialData.comment}"</p>
      </div>
    )
  }

  return (
    <div className="bg-card border-2 border-blue-500/10 rounded-3xl p-6 space-y-6 shadow-sm">
      <div className="text-center">
        <h3 className="text-lg font-bold">Оцените работу мастера</h3>
      </div>

      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110 active:scale-90"
          >
            <Star className={cn("w-10 h-10 transition-colors", rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
          </button>
        ))}
      </div>

      <Textarea
        placeholder="Что вам особенно понравилось?"
        className="rounded-2xl resize-none bg-muted/20 border-none"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <Button
        className="w-full h-12 rounded-xl font-bold"
        disabled={isPending || !comment.trim()}
        onClick={() => mutate({ orderId, profileId, rating, comment })}
      >
        {isPending ? "Сохранение..." : "Опубликовать отзыв"}
      </Button>
    </div>
  )
}
