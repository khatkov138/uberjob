"use server"


import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// Вспомогательная функция для расчета расстояния в км
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Радиус Земли
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getSmartNearbyFeed(
  lat?: number,
  lng?: number,
  radiusKm: number = 60
) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { skills: true }
  })

  const masterSkills = profile?.skills || []

  try {
    // 1. Берем ВСЕ активные заказы, кроме своих
    const allOrders = await prisma.order.findMany({
      where: {
        status: "PENDING",
      //  clientId: { not: userId }
      },
      include: {
        client: {
          select: { name: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

 
    // 2. Если нет координат мастера, возвращаем просто список (или пустой)
    if (!lat || !lng) return { success: true, data: [] }



    // 3. Фильтруем по радиусу и добавляем данные о совпадении и дистанции в JS
    const ordersWithDistance = allOrders
      .map(order => {
        const orderLat = order.lat ?? 0;
        const orderLng = order.lng ?? 0;
        const distance = getDistance(lat, lng, orderLat, orderLng);

        return {
          ...order,
          distance,
          clientName: order.client.name, // Для совместимости с твоей версткой
          clientImage: order.client.image,
          isMatch: masterSkills.includes(order.category)
        }
      })
      .filter(order => order.distance <= radiusKm) // Фильтр по радиусу
      .sort((a, b) => {
        // Сортировка: сначала те, что подходят по скиллам, потом по расстоянию
        if (a.isMatch && !b.isMatch) return -1
        if (!a.isMatch && b.isMatch) return 1
        return a.distance - b.distance
      })

    return { success: true, data: ordersWithDistance }
  } catch (error) {
    console.error("FEED_PRISMA_ERROR:", error)
    return { success: false, error: "Ошибка при получении ленты" }
  }
}


export async function toggleMasterSkill(skill: string) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false }

  // Ищем профиль мастера по userId
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { skills: true }
  })

  if (!profile) return { success: false, error: "Профиль не найден" }

  const isExist = profile.skills.includes(skill)
  const newSkills = isExist 
    ? profile.skills.filter(s => s !== skill) 
    : [...profile.skills, skill]

  // Обновляем массив навыков в таблице profile
  await prisma.profile.update({
    where: { userId },
    data: { skills: newSkills }
  })

  revalidatePath("/pro/feed")
  return { success: true }
}



