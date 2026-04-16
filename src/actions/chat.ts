"use server"


import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function sendMessage({ orderId, text }: { orderId: string, text: string }) {
  const session = await getServerSession()
  if (!session?.user) return { success: false }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { clientId: true, workerId: true, title: true }
  })

  if (!order) return { success: false }

  // Определяем, кому отправить уведомление (если пишет клиент — мастеру, и наоборот)
  const recipientId = session.user.id === order.clientId ? order.workerId : order.clientId

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        text,
        orderId,
        senderId: session.user.id
      }
    })

    if (recipientId) {
      await tx.notification.create({
        data: {
          userId: recipientId,
          title: `Новое сообщение 💬`,
          message: `По заказу "${order.title}": ${text.substring(0, 30)}...`,
          type: "CHAT",
          link: session.user.role === "PRO" ? `/client/orders/${orderId}` : `/pro/orders/${orderId}`
        }
      })
    }
    return msg
  })

  revalidatePath(`/client/orders/${orderId}`)
  revalidatePath(`/pro/orders/${orderId}`)
  return { success: true }
}