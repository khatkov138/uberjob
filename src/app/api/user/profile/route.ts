import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session"; // Твой путь к получению сессии
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Проверяем авторизацию
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Ищем профиль в базе данных по userId
    // Нам нужны только навыки (skills), но можно забрать и bio/rating
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        skills: true,
        bio: true,
        rating: true,
        
      },
    });

    // 3. Если профиля еще нет (например, новый юзер), возвращаем пустую структуру
    if (!profile) {
      return NextResponse.json({
        skills: [],
        bio: "",
        rating: 5.0,
      });
    }

    // 4. Отдаем данные
    return NextResponse.json(profile);
    
  } catch (error) {
    console.error("API_USER_PROFILE_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
