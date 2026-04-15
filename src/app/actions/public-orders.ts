
"use server"
import prisma from "@/lib/prisma"

export async function getLatestPublicOrders() {
  return await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      categories: true,
      address: true, // наш город
    }
  })
}
