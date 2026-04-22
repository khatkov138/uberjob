"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getMyProfile() {
  const session = await getServerSession()
  if (!session?.user?.id) return null

  return await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      skills: {
        include: {
          category: true // Чтобы сразу иметь названия для UI
        }
      }
    }
  })
}

export async function addSkill(categoryId: string) {
  const session = await getServerSession()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    })
    if (!profile) return { success: false, error: "Profile not found" }

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

    revalidatePath("/pro/orders")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Ошибка при добавлении" }
  }
}

export async function removeSkill(categoryId: string) {
  const session = await getServerSession()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id }
    })
    if (!profile) return { success: false, error: "Profile not found" }

    await prisma.profileCategory.delete({
      where: {
        profileId_categoryId: {
          profileId: profile.id,
          categoryId: categoryId
        }
      }
    })

    revalidatePath("/pro/orders")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Ошибка при удалении" }
  }
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

