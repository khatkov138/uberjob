"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function sendMessage(data: { orderId: string, recipientId: string, text: string }) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const message = await prisma.message.create({
      data: {
        text: data.text,
        orderId: data.orderId,
        senderId: userId,
        recipientId: data.recipientId
      }
    })

    revalidatePath(`/client/messages/${data.orderId}`)
    return { success: true, data: message }
  } catch (error) {
    return { success: false, error: "Ошибка отправки" }
  }
}

export async function getChatMessages(orderId: string, workerId: string) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return []

  return await prisma.message.findMany({
    where: {
      orderId,
      OR: [
        { senderId: userId, recipientId: workerId },
        { senderId: workerId, recipientId: userId }
      ]
    },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { name: true, image: true } }
    }
  })
}
