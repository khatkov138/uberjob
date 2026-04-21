import * as React from "react"
import { notFound } from "next/navigation"
import { getOrderById } from "@/actions/orders/orders"
import { OrderDetailsUI } from "./order-details-ui"
import { Container } from "@/components/shared/container"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params
  
  // Вызываем наш чистый экшен
  const data = await getOrderById(id)

  if (!data || !data.order) {
    return notFound()
  }

  return (
    <Container className="max-w-7xl bg-slate-50/50 border-none shadow-none">
      <OrderDetailsUI
        order={data.order}
        existingOffer={data.existingOffer}
        userId={data.userId}
      />
    </Container>
  )
}
