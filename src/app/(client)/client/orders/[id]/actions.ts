"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { OrderStatus } from "../../../../../../prisma/generated"
import { revalidatePath } from "next/cache"


export async function getOrderDetails(orderId: string) {
  const session = await getServerSession()
  if (!session?.user) return null

  return await prisma.order.findUnique({
    where: { id: orderId, clientId: session.user.id },
    include: {
      worker: {
        select: { 
          name: true, 
          image: true, 
          workerProfile: { select: { rating: true, skills: true } } 
        }
      }
    }
  })
}

// Экшен для подтверждения, что работа реально сделана (после того как мастер нажал "Завершить")
export async function confirmOrderCompletion(orderId: string) {
  const session = await getServerSession()
  if (!session?.user) return { success: false }

  await prisma.order.update({
    where: { id: orderId, clientId: session.user.id },
    data: { status: OrderStatus.COMPLETED }
  })

  revalidatePath(`/client/orders/${orderId}`)
  return { success: true }
}