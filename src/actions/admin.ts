"use server"
import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { isSuperAdmin } from "@/lib/auth-client"

export async function promoteToAdmin(userId: string) {
    const session = await getServerSession()
    
    // Жёсткая проверка: если ты не Super, ты не можешь раздавать роли
    if (!isSuperAdmin(session?.user?.role)) {
        throw new Error("У вас недостаточно прав для этого действия")
    }

    return await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' }
    })
}