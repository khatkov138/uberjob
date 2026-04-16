"use server"

import prisma from "@/lib/prisma"

import { revalidatePath } from "next/cache"
import { getServerSession } from "@/lib/get-session"
import { Order, OrderStatus } from "../../prisma/generated"

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


export async function getActiveWorkSummary() {
  const session = await getServerSession()
  if (!session?.user) return null

  // Берем 2-3 последних заказа в работе
  const activeOrders = await prisma.order.findMany({
    where: {
      workerId: session.user.id,
      status: { in: ["ACCEPTED", "IN_PROGRESS"] }
    },
    take: 3,
    orderBy: { updatedAt: 'desc' }
  })

  return activeOrders
}

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


export async function getProOrders() {
  const session = await getServerSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  try {
    const orders = await prisma.order.findMany({
      where: { 
        workerId: session.user.id 
      },
      include: {
        client: { select: { name: true, image: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })
    return { success: true, data: orders }
  } catch (e) {
    return { success: false, error: "Ошибка загрузки" }
  }
}

export async function createOffer(data: { orderId: string, price: number, message: string }) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Нужна авторизация" }

  try {
    // ПРОВЕРКА: открыт ли заказ для предложений
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { status: true }
    })

    if (!order) return { success: false, error: "Заказ не найден" }
    
    // Если статус не PENDING и не SEARCHING — значит исполнитель уже в процессе выбора или выбран
    if (order.status !== "PENDING" && order.status !== "SEARCHING") {
      return { success: false, error: "Исполнитель уже выбран. Этот заказ закрыт для новых предложений." }
    }

    // Создаем отклик
    await prisma.offer.create({
      data: {
        orderId: data.orderId,
        workerId: userId,
        price: data.price,
        message: data.message,
      }
    })

    revalidatePath(`/pro/orders/${data.orderId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: "Не удалось отправить отклик" }
  }
}

