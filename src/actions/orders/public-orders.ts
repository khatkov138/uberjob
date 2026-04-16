
"use server"
import prisma from "@/lib/prisma"

// app/actions/public-orders.ts
export async function getLatestPublicOrders() {
  return await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      categories: true,
      address: true,
      createdAt: true, // Добавляем время
    }
  })
}
