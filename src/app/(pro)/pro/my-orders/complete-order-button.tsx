"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CheckCircle } from "lucide-react"
import { completeOrder } from "@/actions/orders/orders"

export function CompleteOrderButton({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => completeOrder(orderId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Работа завершена!")
        queryClient.invalidateQueries({ queryKey: ["pro-orders"] })
      } else {
        toast.error(res.error)
      }
    },
  })

  return (
    <Button 
      onClick={() => mutate()} 
      disabled={isPending}
      variant="default"
      className="bg-green-600 hover:bg-green-700"
    >
      <CheckCircle className="w-4 h-4 mr-2" />
      {isPending ? "Обработка..." : "Завершить работу"}
    </Button>
  )
}