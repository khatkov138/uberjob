"use server"

import prisma from "@/lib/prisma"
import { Order, OrderStatus } from "../../../prisma/generated"
import { revalidatePath } from "next/cache"
import { getServerSession } from "@/lib/get-session"

export async function getNearbyOrders(lat: number, lng: number, radiusKm: number = 10) {
  try {

    // Используем формулу Haversine для расчета расстояния прямо в SQL
    // 6371 — радиус Земли в км
    const orders = await prisma.$queryRaw`
      SELECT * FROM "order"
      WHERE "status" = 'PENDING'
      AND (
        6371 * acos(
          cos(radians(${lat})) * cos(radians(lat)) * 
          cos(radians(lng) - radians(${lng})) + 
          sin(radians(${lat})) * sin(radians(lat))
        )
      ) <= ${radiusKm}
      ORDER BY "createdAt" DESC
      LIMIT 20
    `

    return { success: true, data: orders as Order[] }
  } catch (error) {
    console.error("Geo-search error:", error)
    return { success: false, error: "Не удалось найти заказы поблизости" }
  }
}

export async function acceptOrder(orderId: string) {

  const session = await getServerSession();
  const user = session?.user;

  if (!user) return { error: "Unauthorized" }

  try {
    // Используем транзакцию, чтобы избежать состояния гонки (race condition)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Проверяем, не взял ли его кто-то другой, пока мастер раздумывал
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true }
      })

      if (!order || order.status !== OrderStatus.PENDING) {
        throw new Error("Заказ уже взят или отменен")
      }

      // 2. Обновляем статус и назначаем мастера
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.ACCEPTED,
          workerId: user.id,
        },
      })

      return updatedOrder
    })

    revalidatePath("/pro")
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || "Ошибка при принятии заказа" }
  }
}