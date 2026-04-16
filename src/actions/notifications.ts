"use server"

import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Пометить конкретное уведомление как прочитанное
export async function markAsRead(id: string) {
  const session = await getServerSession()
  if (!session?.user) return { success: false }

  await prisma.notification.update({
    where: { id, userId: session.user.id },
    data: { isRead: true }
  })

  return { success: true }
}

// Пометить ВСЕ уведомления пользователя как прочитанные
export async function markAllAsRead() {
  const session = await getServerSession()
  if (!session?.user) return { success: false }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true }
  })

  return { success: true }
}