"use server"

import prisma from "@/lib/prisma"

import { revalidatePath } from "next/cache"
import { getServerSession } from "@/lib/get-session"
import { ActiveOrder } from "@/lib/types/types"



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


export async function getActiveWorkSummary(): Promise<ActiveOrder[]> {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) return []

  try {
    // Берем последние заказы в работе с полной подгрузкой связей
    const activeOrders = await prisma.order.findMany({
      where: {
        workerId: userId,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] }
      },
      include: {
        // ОБЯЗАТЕЛЬНО: подгружаем категории для типа ActiveOrder
        categories: {
          include: {
            category: true
          }
        },
        // ОБЯЗАТЕЛЬНО: подгружаем данные клиента
        client: {
          select: {
            name: true,
            image: true
          }
        }
      },
      take: 3,
      orderBy: { updatedAt: 'desc' }
    })

    // Принудительно приводим к типу, так как Prisma возвращает чуть более сложный объект
    return activeOrders

  } catch (error) {
    console.error("GET_ACTIVE_WORK_ERROR:", error)
    return []
  }
}












