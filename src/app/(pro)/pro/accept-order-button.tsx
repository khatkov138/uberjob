import { useMutation, useQueryClient } from "@tanstack/react-query"
import { acceptOrder } from "@/app/actions/pro"

import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export function AcceptOrderButton({ orderId }: { orderId: string }) {

    const queryClient = useQueryClient()

    const { mutate, isPending } = useMutation({
        mutationFn: () => acceptOrder(orderId),
        onSuccess: (res) => {
            if (res.success) {
                toast(
                    "Заказ ваш!",
                    {
                        description: "Свяжитесь с клиентом для уточнения деталей.",
                    })
                // Убираем заказ из списка доступных
                queryClient.invalidateQueries({ queryKey: ["nearby-orders"] })
            } else {
                toast(
                    "Упс!",
                    {
                        description: res.error,
                    })
            }
        },
    })

    return (
        <Button
            onClick={() => mutate()}
            disabled={isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
        >
            {isPending ? (
                "Бронирование..."
            ) : (
                <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Взять заказ
                </>
            )}
        </Button>
    )
}