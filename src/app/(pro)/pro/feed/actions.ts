"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"

export async function getSmartNearbyFeed(lat?: number, lng?: number, radiusKm: number = 30) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { skills: true }
  })

  if (!profile || !profile.skills.length) {
    return { success: true, data: [], needsSkills: true }
  }

  if (lat && lng) {
    // Магия SQL: выбираем заказы + считаем дистанцию (distance)
    const orders = await prisma.$queryRaw`
      SELECT o.*, u.name as "clientName", u.image as "clientImage",
      (6371 * acos(
          cos(radians(${lat})) * cos(radians(o.lat)) * 
          cos(radians(o.lng) - radians(${lng})) + 
          sin(radians(${lat})) * sin(radians(o.lat))
      )) AS distance
      FROM "order" o
      JOIN "user" u ON o."clientId" = u.id
      WHERE o."status" = 'PENDING'
      AND o."category" = ANY(${profile.skills})
      AND o."clientId" != ${userId}
      AND (6371 * acos(
          cos(radians(${lat})) * cos(radians(o.lat)) * 
          cos(radians(o.lng) - radians(${lng})) + 
          sin(radians(${lat})) * sin(radians(o.lat))
      )) <= ${radiusKm}
      ORDER BY distance ASC
      LIMIT 50
    `
    return { success: true, data: orders as any[], needsSkills: false }
  }

  // Если координат нет, просто отдаем по навыкам
  const orders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      category: { in: profile.skills },
      clientId: { not: userId }
    },
    include: { client: { select: { name: true, image: true } } },
    orderBy: { createdAt: 'desc' }
  })

  return { success: true, data: orders, needsSkills: false }
}