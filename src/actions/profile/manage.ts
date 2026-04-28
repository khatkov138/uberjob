"use server"

import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"

/**
 * ДОБАВИТЬ НАВЫК
 */
export async function addSkill(categoryId: string) {
  return createAuthAction(async (userId) => {
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { userId }
    })

    await prisma.profileCategory.upsert({
      where: {
        profileId_categoryId: {
          profileId: profile.id,
          categoryId
        }
      },
      create: {
        profileId: profile.id,
        categoryId
      },
      update: {}
    })

    return null
  })
}

/**
 * УДАЛИТЬ НАВЫК
 */
export async function removeSkill(categoryId: string) {
  return createAuthAction(async (userId) => {
    await prisma.profileCategory.deleteMany({
      where: {
        categoryId,
        profile: { userId }
      }
    })

    return null
  })
}
