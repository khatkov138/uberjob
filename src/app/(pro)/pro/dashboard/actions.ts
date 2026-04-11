"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"


export async function getProStats() {
  const session = await getServerSession()
  if (!session?.user) return null

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { reviews: true }
      }
    }
  })

  const completedOrders = await prisma.order.findMany({
    where: { workerId: session.user.id, status: "COMPLETED" },
    select: { price: true }
  })

  const totalEarnings = completedOrders.reduce((sum, order) => sum + order.price, 0)

  return {
    rating: profile?.rating || 5.0,
    reviewsCount: profile?._count.reviews || 0,
    earnings: totalEarnings / 100,
    completedCount: completedOrders.length
  }
}


export async function getActiveWorkSummary() {
  const session = await getServerSession()
  if (!session?.user) return null

  // Берем 2-3 последних заказа в работе
  const activeOrders = await prisma.order.findMany({
    where: {
      workerId: session.user.id,
      status: { in: ["ACCEPTED", "IN_PROGRESS"] }
    },
    take: 3,
    orderBy: { updatedAt: 'desc' }
  })

  return activeOrders
}