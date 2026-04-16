import prisma from "@/lib/prisma"

export async function ensureProfile(userId: string) {
  // 1. Сначала просто ищем профиль
  const profile = await prisma.profile.findUnique({
    where: { userId }
  })

  // 2. Если он нашелся — всё супер, возвращаем его
  if (profile) return profile

  // 3. Если его НЕТ (тот самый случай ошибки в хуке) — создаем его прямо сейчас
  console.log(`[FIX]: Профиль для юзера ${userId} не найден. Создаю принудительно...`)
  
  return await prisma.profile.create({
    data: {
      userId,
      skills: [],
      rating: 5.0
    }
  })
}