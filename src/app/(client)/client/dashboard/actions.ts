"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"

export async function getClientStats() {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return null

  const [activeOrders, totalOrders, user] = await Promise.all([
    prisma.order.count({ where: { clientId: userId, status: { in: ['PENDING', 'SEARCHING', 'ACCEPTED', 'IN_PROGRESS'] } } }),
    prisma.order.count({ where: { clientId: userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { balance: true } })
  ])

  return {
    activeCount: activeOrders,
    totalCount: totalOrders,
    balance: user?.balance || 0
  }
}
