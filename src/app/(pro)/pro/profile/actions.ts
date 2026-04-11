"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateWorkerProfile(skills: string[], bio?: string) {
  const session = await getServerSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  try {
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: { 
        skills,
        bio 
      },
    })

    revalidatePath("/pro/feed") // Чтобы лента сразу обновилась
    revalidatePath("/pro/profile")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Не удалось обновить профиль" }
  }
}