"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"


export async function getProOrders() {
  const session = await getServerSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  try {
    const orders = await prisma.order.findMany({
      where: { 
        workerId: session.user.id 
      },
      include: {
        client: { select: { name: true, image: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })
    return { success: true, data: orders }
  } catch (e) {
    return { success: false, error: "Ошибка загрузки" }
  }
}