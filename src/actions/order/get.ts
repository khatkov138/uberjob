"use server"

import { FeedContext } from "@/app/(public)/orders/[[...slug]]/page"
import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { createAction, createAuthAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"
import { OrderStatus } from "@prisma/client"


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

    if (!order) throw new Error("Not found");

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



export type ClientOrder = InferActionResult<typeof getClientOrders>
export type OrderByIdOrSlugResponse = InferActionResult<typeof getOrderByIdOrSlug>


