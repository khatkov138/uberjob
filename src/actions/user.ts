"use server"


import { z } from "zod"
import { Role } from "../../../prisma/generated"
import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Схема валидации: разрешаем ТОЛЬКО переключение между CLIENT и PRO
const toggleRoleSchema = z.enum([Role.CLIENT, Role.PRO])

export async function toggleUserRole(rawRole: unknown) {
  // 1. Проверка сессии
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) {
    return { success: false, error: "Вы должны быть авторизованы" }
  }

  // 2. Валидация входных данных через Zod
  const validation = toggleRoleSchema.safeParse(rawRole)
  
  if (!validation.success) {
    return { 
      success: false, 
      error: "Недопустимая роль. Роль администратора нельзя назначить самостоятельно." 
    }
  }

  const newRole = validation.data

  // 3. Дополнительная проверка: если текущий юзер — АДМИН, 
  // возможно, ты не хочешь, чтобы он случайно "понизил" себя до клиента
  if (session.user.role === Role.ADMIN) {
    return { success: false, error: "Администратор не может менять роль через этот интерфейс" }
  }

  try {
    // 4. Выполняем обновление в базе через транзакцию (для надежности)
    await prisma.$transaction(async (tx) => {
      // Обновляем роль
      await tx.user.update({
        where: { id: userId },
        data: { role: newRole },
      })

      // Если роль PRO — гарантируем наличие профиля мастера
      if (newRole === Role.PRO) {
        await tx.profile.upsert({
          where: { userId: userId },
          update: {}, // Если профиль уже есть, ничего не трогаем
          create: { 
            userId: userId, 
            skills: [],
            rating: 5.0,
            isOnline: true 
          }
        })
      }
    })

    // 5. Инвалидируем кэш, чтобы UI сразу обновился
    revalidatePath("/") 
    return { success: true }

  } catch (error) {
    console.error("CRITICAL: Role update failed:", error)
    return { success: false, error: "Ошибка базы данных при смене роли" }
  }
}