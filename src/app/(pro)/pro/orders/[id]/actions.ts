"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { OrderStatus } from "../../../../../../prisma/generated"
import { revalidatePath } from "next/cache"


export async function getProOrderDetails(orderId: string) {
  const session = await getServerSession()
  if (!session?.user) return null

  return await prisma.order.findUnique({
    where: {
      id: orderId,
      // Заказ должен либо быть свободным, либо уже принадлежать этому мастеру
      OR: [
        { status: OrderStatus.PENDING },
        { workerId: session.user.id }
      ]
    },
    include: {
      client: { select: { name: true, image: true } },
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })
}

export async function startOrderWork(orderId: string) {
  const session = await getServerSession()
  if (!session?.user) return { success: false }

  await prisma.order.update({
    where: { id: orderId, workerId: session.user.id },
    data: { status: OrderStatus.IN_PROGRESS }
  })

  revalidatePath(`/pro/orders/${orderId}`)
  return { success: true }
}


export async function acceptOrderDetails(orderId: string) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const updated = await prisma.order.update({
      where: { id: orderId, status: "PENDING" }, // Защита: взять можно только свободный
      data: {
        status: "ACCEPTED",
        workerId: userId
      }
    })
    revalidatePath(`/pro/orders/${orderId}`)
    return { success: true, data: updated }
  } catch (e) {
    return { success: false, error: "Заказ уже занят другим мастером" }
  }
}