"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";

// Вспомогательная функция для расчета расстояния
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
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

  try {
    // 1. Получаем навыки мастера
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { skills: true }
    })
    const masterSkills = profile?.skills || []

    // 2. Берем заказы со статусом PENDING или SEARCHING
    // Добавляем статистику клиента (кол-во созданных заказов)
    const allOrders = await prisma.order.findMany({
      where: { status: "PENDING" },
      include: {
        client: {
          select: {
            name: true,
            image: true,
            // _count должен быть именно здесь, внутри select клиента
            _count: {
              select: { ordersCreated: true }
            }
          }
        },
        _count: {
          select: { offers: true } // А этот _count относится к самому заказу
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!lat || !lng) return { success: true, data: [] }

    // 3. Обработка и фильтрация
    const ordersWithDistance = allOrders
      .map(order => {
        const distance = getDistance(lat, lng, order.lat ?? 0, order.lng ?? 0);

        // Проверяем совпадение хотя бы одной категории
        const isMatch = order.categories.some(cat => masterSkills.includes(cat));

        return {
          ...order,
          distance,
          isMatch,
          // Собираем объект клиента так, как его ждет OrderCard
          client: {
            name: order.client?.name || "Заказчик",
            image: order.client?.image,
            projects: order.client?._count.ordersCreated || 0,
            hireRate: 0 // Пока заглушка, позже посчитаем реально
          },
          offersCount: order._count?.offers || 0
        }
      })
      .filter(order => order.distance <= radiusKm)
      .sort((a, b) => {
        // ПРИОРИТЕТ 1: Сначала самые новые
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeB !== timeA) return timeB - timeA;

        // ПРИОРИТЕТ 2: Сначала те, что подходят по навыкам
        if (a.isMatch && !b.isMatch) return -1;
        if (!a.isMatch && b.isMatch) return 1;

        return a.distance - b.distance;
      });

    return { success: true, data: ordersWithDistance }
  } catch (error) {
    console.error("FEED_ERROR:", error)
    return { success: false, error: "Не удалось обновить ленту" }
  }
}

export async function toggleMasterSkill(skill: string) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { skills: true }
  })

  if (!profile) return { success: false, error: "Профиль не найден" }

  const newSkills = profile.skills.includes(skill)
    ? profile.skills.filter(s => s !== skill)
    : [...profile.skills, skill]

  await prisma.profile.update({
    where: { userId },
    data: { skills: newSkills }
  })

  revalidatePath("/pro/feed")
  return { success: true }
}

export async function getAllCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });
  } catch (error) {
    return [];
  }
}
