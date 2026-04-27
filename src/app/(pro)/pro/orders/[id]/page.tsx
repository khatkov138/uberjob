// app/(pro)/pro/orders/[id]/page.tsx
import * as React from "react"
import { notFound } from "next/navigation"
import { getOrderById } from "@/actions/order/get" // Путь к нашему новому get.ts
import { OrderDetailsUI } from "./order-details-ui"
import { Container } from "@/components/shared/container"
import { unwrap } from "@/lib/utils"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params // Вот наш железный ID из URL
  const data = unwrap(await getOrderById(id), null)

  if (!data) return notFound()

  return (
    <Container className="max-w-7xl bg-slate-50/50 border-none shadow-none">
      <OrderDetailsUI
        orderId={id} // Передаем ID напрямую
        initialData={data} />
    </Container>

  )
}
