"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"


async function getFullProfileQuery(userId: string) {
  return await prisma.profile.findUnique({
    where: { userId },
    include: {
      skills: {
        include: {
          category: true
        }
      }
    }
  })
}

/*
 * 3. Основной Action.
 * Мы используем createAuthAction, поэтому сессия и ошибки обрабатываются автоматически.
 */
export type FullProfile = Prisma.PromiseReturnType<typeof getFullProfileQuery>

/**
 * 2. Переработанный экшен (Чистый async export)
 */
export async function getMyProfile() {
  return createAuthAction(async (userId) => {

    const profile = await getFullProfileQuery(userId)

    if (!profile) {
      throw new Error("Профиль не найден")
    }

    return profile
  })
}

export async function addSkill(categoryId: string) {
  return createAuthAction(async (userId) => {
    // 1. Ищем профиль (используем findUniqueOrThrow, чтобы не писать лишние if)
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { userId }
    })

    // 2. Делаем апсерт
    await prisma.profileCategory.upsert({
      where: {
        profileId_categoryId: {
          profileId: profile.id,
          categoryId: categoryId
        }
      },
      create: {
        profileId: profile.id,
        categoryId: categoryId
      },
      update: {}
    })


    return null // Данные не нужны, возвращаем null (success: true проставится сам)
  })
}

/**
 * УДАЛИТЬ НАВЫК
 */
export async function removeSkill(categoryId: string) {
  return createAuthAction(async (userId) => {

    await prisma.profileCategory.deleteMany({
      where: {
        categoryId: categoryId,
        profile: {
          userId: userId
        }
      }
    })


    return null
  })
}


export async function getProfileData(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: {
        include: {
          skills: {
            include: {
              category: true
            }
          }
        }
      }
    }
  })

  if (!user || !user.profile) return null

  // Логика онлайна
  const lastSeenDate = new Date(user.profile.lastSeen)
  const isOnline = (Date.now() - lastSeenDate.getTime()) / (1000 * 60) < 5

  return {
    user,
    profile: user.profile,
    isOnline,
    lastSeenDate
  }
}

