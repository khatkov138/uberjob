"use server"


import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { updateProfileSchema } from "@/lib/validation" // Импортируем схему
import prisma from "@/lib/prisma"

export async function updateProfile(values: unknown) {
    const session = await getServerSession()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    // ИСПОЛЬЗУЕМ .partial(), чтобы Zod не требовал все поля сразу
    // Теперь можно прислать только { image: "..." } и это будет валидно
    const validatedFields = updateProfileSchema.partial().safeParse(values)

    if (!validatedFields.success) {
        return { success: false, error: "Неверный формат данных" }
    }

    const data = validatedFields.data

    try {
        await prisma.$transaction(async (tx) => {
            // 2. Обновляем User (имя, фото)
            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    name: data.name,
                    image: data.image,
                }
            })

            // 3. Обновляем Profile (био, навыки)
            await tx.profile.update({
                where: { userId: session.user.id },
                data: {
                    bio: data.bio,
                    skills: data.skills
                }
            })
        })

        revalidatePath("/settings")
        return { success: true, error: null }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Ошибка при сохранении в базу данных" }
    }
}
