"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createOrder } from "@/app/actions/orders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// стандартный хук shadcn
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function CreateOrderForm() {

    const queryClient = useQueryClient()

    const { mutate, isPending } = useMutation({
        mutationFn: createOrder,
        onSuccess: (res) => {
            if (res.success) {
                toast("Заказ создан!", { description: `Категория: ${res.data?.category}` })
                queryClient.invalidateQueries({ queryKey: ["orders"] }) // Инвалидируем список заказов
            }
        },
    })

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        mutate({
            title: formData.get("title") as string,
            description: formData.get("description") as string,
            address: formData.get("address") as string,
            price: Number(formData.get("price")),
           
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md p-4 border rounded-xl bg-card">
            <Input name="title" placeholder="Что нужно сделать?" required />
            <Textarea name="description" placeholder="Опишите детали (например: течет кран на кухне)" required />
            <Input name="address" placeholder="Адрес" required />
            <Input name="price" type="number" placeholder="Бюджет (руб)" required />

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Публикация..." : "Найти мастера"}
            </Button>
        </form>
    )
}