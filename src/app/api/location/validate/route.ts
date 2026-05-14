// src/app/api/location/validate/route.ts
import { type NextRequest } from "next/server";
import { createApiResponse } from "@/lib/server-utils";
import prisma from "@/lib/prisma";

// Изолируем логику, чтобы TypeScript автоматически вывел тип возвращаемого значения
async function validateLocation(slug: string | null) {
  if (!slug || slug.length < 3) {
    return { valid: false as const }; // Используем as const для точного вывода литералов
  }

  // ШАГ №1: Ищем точное совпадение
  let dbLocation = await prisma.location.findUnique({
    where: { slug },
    select: { id: true }
  });

  // ШАГ №2: Ищем по началу строки
  if (!dbLocation) {
    dbLocation = await prisma.location.findFirst({
      where: { slug: { startsWith: slug } },
      select: { id: true },
      orderBy: { slug: 'asc' }
    });
  }

  // ШАГ №3: Ищем по частичному вхождению
  if (!dbLocation) {
    dbLocation = await prisma.location.findFirst({
      where: { slug: { contains: slug } },
      select: { id: true },
      orderBy: { slug: 'asc' }
    });
  }

  if (!dbLocation) {
    return { valid: false as const };
  }

  return {
    valid: true as const,
    id: dbLocation.id
  };
}

export type LocationValidationResult = Awaited<ReturnType<typeof validateLocation>>;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Добавляем || null в конец, чтобы гарантировать тип string | null
  const slug = searchParams.get("slug")?.toLowerCase().trim() || null;

  return createApiResponse<LocationValidationResult>(async () => {
    // Теперь типы идеально сходятся: slug имеет тип string | null
   
    return validateLocation(slug);
  });
}