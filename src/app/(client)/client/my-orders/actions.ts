"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getClientOrders() {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const orders = await prisma.order.findMany({
      where: { clientId: userId },
      include: {
        offers: {
          include: {
            worker: {
              select: {
                name: true,
                image: true,
                workerProfile: {
                  select: { rating: true, skills: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: orders }
  } catch (error) {
    return { success: false, error: "Ошибка загрузки" }
  }
}

export async function acceptOffer(orderId: string, offerId: string, workerId: string) {
  try {
    await prisma.$transaction([
      // 1. Помечаем заказ как принятый и назначаем мастера
      prisma.order.update({
        where: { id: orderId },
        data: { status: "ACCEPTED", workerId }
      }),
      // 2. Помечаем выбранный отклик как принятый
      prisma.offer.update({
        where: { id: offerId },
        data: { status: "ACCEPTED" }
      }),
      // 3. Остальные отклики отклоняем
      prisma.offer.updateMany({
        where: { orderId, id: { not: offerId } },
        data: { status: "REJECTED" }
      })
    ])

    revalidatePath("/client/my-orders")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Не удалось принять предложение" }
  }
}
