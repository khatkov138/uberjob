import * as React from "react"
import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { OrderDetailsUI } from "./order-details-ui"

// Описываем тип params как Promise
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderPage({ params }: PageProps) {
  // 1. Ждем получения id
  const { id } = await params
  
  const session = await getServerSession()
  const userId = session?.user?.id

  // 2. Получаем полные данные заказа
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          name: true,
          image: true,
          createdAt: true,
          _count: { select: { ordersCreated: true } }
        }
      },
      _count: {
        select: { offers: true }
      }
    }
  })

  if (!order) return notFound()

  // 3. Проверяем, есть ли уже отклик от этого мастера
  let existingOffer = null
  if (userId) {
    existingOffer = await prisma.offer.findFirst({
      where: {
        orderId: id,
        workerId: userId
      }
    })
  }

  return (
    <main className="min-h-screen bg-slate-50/50 pb-20">
      <OrderDetailsUI 
        order={order} 
        existingOffer={!!existingOffer} 
        userId={userId} 
      />
    </main>
  )
}
