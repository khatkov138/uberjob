import * as React from "react"
import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { OrderDetailsUI } from "./order-details-ui"
import { Container } from "@/components/shared/container"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderPage({ params }: PageProps) {
  // 1. Ждем получения id (Next.js 15)
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

  // 3. Проверяем, есть ли уже отклик от этого исполнителя
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
    /**
     * Container берет на себя:
     * - Центрирование и max-w-5xl
     * - bg-slate-50/50 (стандарт для информационных блоков)
     * - Правильные отступы сверху и снизу
     */
    <Container className="max-w-7xl bg-transparent border-none  shadow-none bg-slate-50/50">
      <OrderDetailsUI
        order={order}
        existingOffer={!!existingOffer}
        userId={userId}
      />
    </Container>
  )
}
