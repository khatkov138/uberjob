"use server"

import prisma from "@/lib/prisma"
import { createAuthAction, createAction } from "@/lib/server-utils"
import { InferActionResult } from "@/lib/types/types"

// Вспомогательная функция для типизации
async function getFullProfileQuery(userId: string) {
  return await prisma.profile.findUnique({
    where: { userId },
    include: {
      // Тянем базовые данные юзера (имя, аватар, почта)
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        }
      },
      // Тянем категории (скиллы) с их названиями
      skills: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true // ОБЯЗАТЕЛЬНО: добавляем для SEO и роутинга
            }
          }
        }
      }
    }
  })
}

/**
 * ПОЛУЧИТЬ МОЙ ПРОФИЛЬ (Приватно)
 */
export async function getMyProfile() {
  return createAuthAction(async (userId) => {
    const profile = await getFullProfileQuery(userId)

    if (!profile) {
      throw new Error("Профиль не найден")
    }

    // Возвращаем плоский объект или как есть — 
    // в компоненте будем обращаться к profile.user.name
    return profile
  })
}
/**
 * ПОЛУЧИТЬ ЧУЖОЙ ПРОФИЛЬ (Публично)
 */
export async function getProfileData(id: string) {
  return createAction(async () => {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            skills: { include: { category: true } }
          }
        }
      }
    })

    if (!user || !user.profile) throw new Error("Пользователь не найден")

    const lastSeenDate = new Date(user.profile.lastSeen)
    const isOnline = (Date.now() - lastSeenDate.getTime()) / (1000 * 60) < 5

    return {
      user,
      profile: user.profile,
      isOnline,
      lastSeenDate
    }
  })
}


export async function getProStats() {
  return createAuthAction(async (userId) => {
    const [profile, completedOrders] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: {
          rating: true,
          _count: { select: { reviews: true } }
        }
      }),
      prisma.order.findMany({
        where: { workerId: userId, status: "COMPLETED" },
        select: { price: true }
      })
    ]);

    const totalEarnings = completedOrders.reduce((sum, order) => sum + order.price, 0);

    return {
      rating: profile?.rating || 5.0,
      reviewsCount: profile?._count.reviews || 0,
      earnings: totalEarnings / 100,
      completedCount: completedOrders.length
    };
  });
}

/**
 * АКТИВНЫЕ ЗАКАЗЫ В РАБОТЕ (Summary)
 */
export async function getActiveWorkSummary() {
  return createAuthAction(async (userId) => {
    const activeOrders = await prisma.order.findMany({
      where: {
        workerId: userId,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] }
      },
      include: {
        categories: { include: { category: true } },
        client: { select: { name: true, image: true } }
      },
      take: 3,
      orderBy: { updatedAt: 'desc' }
    });

    return activeOrders;
  });
}


export type FullProfile = InferActionResult<typeof getMyProfile>;
export type PublicProfile = InferActionResult<typeof getProfileData>;
export type ProStats = InferActionResult<typeof getProStats>;
export type ActiveWorkItem = InferActionResult<typeof getActiveWorkSummary>;
