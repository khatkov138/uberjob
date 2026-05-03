"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"
import { delay, getDistance } from "@/lib/utils"
import { Category, Location, Order, OrderStatus, Prisma } from "@prisma/client"

// ЛЕНТА (Исполнитель)

// Интерфейс для сырого ответа (SQL возвращает числа как bigint)
interface RawOrderQueryResult extends Omit<Order, "price"> {
  price: bigint
  distance: number | null
  is_match: boolean | number
  total_p: bigint
  comp_p: bigint
  off_c: bigint
  // Добавляем поля от JOIN
  loc_name: string | null
  loc_slug: string | null
}

export async function getOrders({
  lat,
  lng,
  radius = 60,
  categoryId,
  locationId
}: {
  lat?: number,
  lng?: number,
  radius?: number,
  categoryId?: string,
  locationId?: string
}) {
  return createAction<FeedOrder[]>(async () => {
    const session = await getServerSession()
    const userId = session?.user?.id

    // 1. Получаем скиллы для подсвечивания матчей
    let skillIds: string[] = []
    if (userId) {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { skills: { select: { categoryId: true } } }
      })
      skillIds = profile?.skills.map(s => s.categoryId) || []
    }
    const hasSkills = skillIds.length > 0

    // 2. Формируем SQL-условие для дистанции
    const distanceSql = (lat && lng)
      ? Prisma.raw(`(6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat))))`)
      : Prisma.raw(`NULL`)

    // 3. Выполняем SQL запрос
    // 1. Подготовка условий
    const skillsList = skillIds.length > 0 ? skillIds.map(id => `'${id}'`).join(',') : "''";

    // 2. Основной SQL
    const raw = await prisma.$queryRaw<RawOrderQueryResult[]>`
      SELECT 
        o.*,
        l.name as loc_name, 
        l.slug as loc_slug,
        (6371 * acos(
          cos(radians((${lat})::double precision)) * cos(radians(o.lat)) * 
          cos(radians(o.lng) - radians((${lng})::double precision)) + 
          sin(radians((${lat})::double precision)) * sin(radians(o.lat))
        )) AS distance,
        (SELECT COUNT(*)::int FROM "order" WHERE "clientId" = o."clientId") as total_p,
        (SELECT COUNT(*)::int FROM "order" WHERE "clientId" = o."clientId" AND "status" = 'COMPLETED') as comp_p,
        (SELECT COUNT(*)::int FROM "offer" WHERE "orderId" = o.id) as off_c,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM "order_category" oc 
            WHERE oc."orderId" = o.id AND oc."categoryId" IN (${Prisma.raw(skillsList)})
          ) THEN true ELSE false 
        END as is_match
      FROM "order" o
      LEFT JOIN "location" l ON l.id = o."locationId"
      ${categoryId ? Prisma.raw(`JOIN "order_category" filter_oc ON filter_oc."orderId" = o.id`) : Prisma.raw('')}
      WHERE o.status = 'PENDING'
      ${categoryId ? Prisma.raw(`AND filter_oc."categoryId" = '${categoryId}'`) : Prisma.raw('')}
      AND (6371 * acos(
          cos(radians((${lat})::double precision)) * cos(radians(o.lat)) * 
          cos(radians(o.lng) - radians((${lng})::double precision)) + 
          sin(radians((${lat})::double precision)) * sin(radians(o.lat))
        )) <= (${radius})::double precision
      ORDER BY is_match DESC, distance ASC, o."createdAt" DESC
    `


    if (!raw.length) return []

    // 4. Загружаем связи (категории и юзеров)
    const orderIds = raw.map(o => o.id)
    const clientIds = [...new Set(raw.map(o => o.clientId))]

    const [categories, clients] = await Promise.all([
      prisma.orderCategory.findMany({
        where: { orderId: { in: orderIds } },
        include: { category: { select: { id: true, name: true, slug: true } } }
      }),
      prisma.user.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true, image: true }
      })
    ])

    // 5. Маппинг в FeedOrder
    return raw.map((o): FeedOrder => {
      const client = clients.find(c => c.id === o.clientId)
      const total = Number(o.total_p)
      const completed = Number(o.comp_p)

      // Извлекаем SQL-специфичные поля
      const {
        loc_name, loc_slug, is_match, off_c,
        total_p, comp_p, price, distance, ...orderData
      } = o

      return {
        ...orderData,
        price: Number(price),
        distance: distance !== null ? Math.round(Number(distance) * 10) / 10 : null,
        isMatch: Boolean(is_match),
        offersCount: Number(off_c),
        location: loc_name ? { name: loc_name, slug: loc_slug ?? "" } : null,
        client: client ? { name: client.name, image: client.image } : null,
        clientStats: {
          projects: total,
          hireRate: total > 0 ? Math.round((completed / total) * 100) : 0
        },
        categories: categories
          .filter(cat => cat.orderId === o.id)
          .map(cat => ({
            categoryId: cat.categoryId,
            category: cat.category
          }))
      }
    })
  })
}

export async function getClientOrders() {
  return createAuthAction(async (userId) => {
    return await prisma.order.findMany({
      where: { clientId: userId },
      include: {
        offers: {
          include: { worker: { select: { name: true, image: true, profile: { select: { rating: true } } } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  })
}


export async function getActiveOrdersCount(role: 'CLIENT' | 'WORKER') {
  return createAuthAction(async (userId) => {
    // Для Клиента активные — это те, что еще не завершены и не отменены
    // Для Воркера активные — это те, где он уже утвержден и работает
    const where = role === 'CLIENT'
      ? {
        clientId: userId,
        status: {
          notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED]
        }
      }
      : {
        workerId: userId,
        status: OrderStatus.IN_PROGRESS
      }

    return await prisma.order.count({
      where
    })
  })
}



export async function getOrderByIdOrSlug(identifier: string) {
  return createAction(async () => {
    const session = await getServerSession()
    const userId = session?.user?.id || null

    // Определяем, по какому полю искать
    // Если строка начинается на 'c' и она достаточно длинная — скорее всего это CUID (ID)
    const isId = identifier.startsWith('c') && identifier.length > 20;
    const where = isId ? { id: identifier } : { slug: identifier };

    const order = await prisma.order.findUnique({
      where,
      include: {
        client: {
          select: {
            name: true,
            image: true,
            createdAt: true,
            _count: { select: { ordersCreated: true } }
          }
        },
        categories: { include: { category: true } },
        location: { select: { name: true, slug: true } }, // Добавляем локацию для деталей
        _count: { select: { offers: true } },
        offers: {
          where: {
            order: { clientId: userId || "guest_access" }
          },
          include: {
            worker: { select: { name: true, image: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    })

    if (!order) return null; // Просто возвращаем null

    const existingOffer = userId
      ? await prisma.offer.findFirst({ where: { orderId: order.id, workerId: userId } })
      : null

    return {
      order,
      existingOffer: !!existingOffer,
      userId
    }
  })
}


export async function getLatestPublicOrders() {
  return createAction(async () => {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,

        location: {
          select: {
            name: true,
            slug: true
          }
        },
        lat: true, // Координаты оставляем, они нужны для карты
        lng: true,
        categories: {
          include: {
            category: true
          }
        },
        createdAt: true,
        client: {
          select: {
            name: true
          }
        }
      },
    });

    return orders;
  });
}

export type FeedOrder = Omit<Order, "price"> & {
  price: number
  distance: number | null
  // isMatch мы вычисляем на клиенте или передаем отдельно, 
  // но в объекте заказа он тоже может быть
  isMatch: boolean
  offersCount: number

  // Данные о локации (для вывода города/района)
  location: Pick<Location, "name" | "slug"> | null

  // Объект клиента из связи userId -> User
  client: {
    name: string | null
    image: string | null
  } | null

  // Связь OrderCategory -> Category
  categories: {
    categoryId: string
    category: Pick<Category, "id" | "name" | "slug">
  }[]

  // Статистика клиента (вычисляемые поля)
  clientStats: {
    projects: number
    hireRate: number
  }
}

export type ClientOrder = InferActionResult<typeof getClientOrders>
export type OrderByIdResponse = InferActionResult<typeof getOrderByIdOrSlug>


