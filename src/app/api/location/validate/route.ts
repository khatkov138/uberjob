// app/api/location/validate/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")?.toLowerCase().trim()

  // Защита от пустых или слишком коротких запросов
  if (!slug || slug.length < 3) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  // 1. ШАГ №1: Ищем строгое точное совпадение (irkutsk -> irkutsk)
  let dbLocation = await prisma.location.findUnique({
    where: { slug },
    select: { id: true }
  })

  // 2. ШАГ №2: Если точного нет, ищем города, начинающиеся на эту строку (angars -> angarsk)
  if (!dbLocation) {
    const suggestions = await prisma.location.findMany({
      where: {
        slug: {
          startsWith: slug,
        }
      },
      select: { id: true },
      take: 1 // Нам нужен только один самый первый релевантный ID
    })
    
    if (suggestions.length > 0) {
      dbLocation = suggestions[0]
    }
  }

  // 3. ШАГ №3: Если все еще пусто, ищем частичное вхождение подстроки (ngarsk -> angarsk)
  if (!dbLocation) {
    const suggestions = await prisma.location.findMany({
      where: {
        slug: {
          contains: slug,
        }
      },
      select: { id: true },
      take: 1
    })

    if (suggestions.length > 0) {
      dbLocation = suggestions[0]
    }
  }

  // Если город или похожий аналог вообще не найдены в базе данных
  if (!dbLocation) {
    return NextResponse.json({ valid: false })
  }

  // Возвращаем валидный статус и ID найденного города для инжекции в куку
  return NextResponse.json({ 
    valid: true, 
    id: dbLocation.id 
  })
}
