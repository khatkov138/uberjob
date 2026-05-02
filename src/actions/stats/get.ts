// src/actions/stats/get.ts
"use server"

import prisma from "@/lib/prisma"
import { createAction } from "@/lib/server-utils"

export async function getPlatformStats(citySlug?: string) {
  return createAction(async () => {
    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 1. Быстрый поиск текущей локации
    const currentLoc = citySlug 
      ? await prisma.location.findUnique({ 
          where: { slug: citySlug },
          select: { id: true, name: true } 
        }) 
      : null

    // 2. Сбор метрик одним махом через Promise.all
    const [
      onlineCount, 
      newOrdersTotal, 
      totalOrders, 
      cityOrdersTotal, 
      cityOrdersToday, 
      lastOrder
    ] = await Promise.all([
      // Считаем реальный онлайн
      prisma.profile.count({ where: { lastSeen: { gte: fiveMinAgo } } }),
      
      // Новые заказы по всей платформе за 24ч
      prisma.order.count({ where: { createdAt: { gte: dayAgo } } }),
      
      // Всего заказов в базе
      prisma.order.count(),

      // Всего АКТИВНЫХ заказов в конкретном городе
      currentLoc 
        ? prisma.order.count({ where: { locationId: currentLoc.id, status: 'PENDING' } }) 
        : Promise.resolve(0),

      // Новые заказы в этом городе за 24ч
      currentLoc 
        ? prisma.order.count({ where: { locationId: currentLoc.id, createdAt: { gte: dayAgo } } }) 
        : Promise.resolve(0),

      // Время последнего созданного заказа для "Пульса"
      prisma.order.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])

    return {
      online: onlineCount + 5, // Небольшой "буст" для визуала на старте
      today: newOrdersTotal,
      total: totalOrders,
      cityCount: cityOrdersTotal,
      cityToday: cityOrdersToday,
      lastOrderTime: lastOrder?.createdAt || now,
      cityName: currentLoc?.name || "Везде"
    }
  })
}
