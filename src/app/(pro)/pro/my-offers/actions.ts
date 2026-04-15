"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"

export async function getMyOffers() {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const offers = await prisma.offer.findMany({
      where: { workerId: userId },
      include: {
        order: {
          select: {
            id: true,
            title: true,
            address: true,
            status: true,
            categories: true,
            // Добавляем выборку клиента для конкретного заказа
            client: { 
              select: { 
                name: true, 
                image: true 
              } 
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: offers }
  } catch (error) {
    console.error("MY_OFFERS_ERROR:", error)
    return { success: false, error: "Ошибка загрузки данных" }
  }
}
