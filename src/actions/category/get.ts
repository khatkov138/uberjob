"use server"

import prisma from "@/lib/prisma";
import { createAction } from "@/lib/server-utils";
import { InferActionResult } from "@/lib/types/types";

/**
 * Получение ВСЕХ категорий
 */
export async function getAllCategories() {
  return createAction(async () => {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        slug: true // Добавили слаг для SEO ссылок
      }
    });

    return categories;
  });
}

/**
 * Получение ПОПУЛЯРНЫХ категорий со счетчиками
 */
// @/actions/category/get.ts
export async function getPopularCategories(lat: number, lng: number, radius: number) {
  return createAction(async () => {
    // 1. Ищем ID заказов в радиусе, который пришел из кук (через getServerLocation)
    const ordersInRange = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "order"
      WHERE status = 'PENDING'
      AND (
        6371 * acos(
          cos(radians(${lat})) * cos(radians(lat)) *
          cos(radians(lng) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(lat))
        )
      ) <= ${radius}
    `;

    const orderIds = ordersInRange.map(o => o.id);
    if (orderIds.length === 0) return [];

    // 2. Считаем статистику по этим заказам
    const categories = await prisma.category.findMany({
      where: {
        orders: { some: { orderId: { in: orderIds } } }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            orders: { where: { orderId: { in: orderIds } } }
          }
        }
      },
      take: 10,
      orderBy: { orders: { _count: 'desc' } }
    });

    return categories;
  });
}


// Твои оригинальные типы
export type DBCategory = InferActionResult<typeof getAllCategories>;
export type PopularCategoryResult = InferActionResult<typeof getPopularCategories>;
