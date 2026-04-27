"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"




// 1. Описываем функцию ЗАПРОСА (только данные)
const getMyOffersData = async (userId: string) => {
  return await prisma.offer.findMany({
    where: { workerId: userId },
    include: {
      order: {
        include: {
          client: { select: { name: true, image: true } },
          categories: { include: { category: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

// 2. ЭКСПОРТИРУЕМ ТИП данных (для компонента)
export type MyOffersWithData = Prisma.PromiseReturnType<typeof getMyOffersData>

// 3. ЭКСПОРТИРУЕМ ЭКШЕН (для страницы)
export async function getMyOffers() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized", data: [] as MyOffersWithData }
  }

  try {
    const data = await getMyOffersData(session.user.id)
    return { success: true, data, error: null }
  } catch (e) {
    return { success: false, error: "Database error", data: [] as MyOffersWithData }
  }
}
