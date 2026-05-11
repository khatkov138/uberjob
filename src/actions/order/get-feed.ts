// src/actions/order/get-feed.ts
"use server"

import { Prisma, Order, Location, Category, User, OrderCategory } from "@prisma/client";
import prisma from "@/lib/prisma"
import { createAction, ActionResponse } from "@/lib/server-utils";
import { FeedContext } from "@/app/(public)/orders/[[...slug]]/page";
import { delay } from "@/lib/utils";

/** 
 * ТИПЫ ДАННЫХ
 */
export interface BaseOrder extends Omit<Order, "price"> {
    price: number;
    distance: number | null;
    isMatch: boolean;
    offersCount: number;
}

export interface FeedOrder extends BaseOrder {
    location: { name: string; slug: string } | null;
    client: Pick<User, "name" | "image"> | null;
    categories: {
        categoryId: string;
        category: Pick<Category, "id" | "name" | "slug">;
    }[];
    clientStats: {
        projects: number;
        hireRate: number;
    };
}

export type GetOrdersResponse<T extends 'list' | 'map'> = {
    orders: T extends 'list' ? FeedOrder[] : BaseOrder[];
    nextCursor: string | null;
    total: number;
};

interface RawSQL extends Order {
    distance: number | null;
    total_p?: number;
    comp_p?: number;
    off_c?: number;
    loc_name?: string | null;
    loc_slug?: string | null;
    is_match_sql: boolean;
}

/**
 * ГЛАВНЫЙ ЭКШЕН
 */
export async function getOrders<T extends 'list' | 'map'>(params: FeedContext & {
    mode: T;
    cursor?: string | null;
    limit?: number;
}): Promise<ActionResponse<GetOrdersResponse<T>>> {

    return createAction<GetOrdersResponse<T>>(async () => {
       await delay(3000)
        const { lat, lng, radius, categoryId, skillIds = [], cursor, limit = 3, mode } = params;
        const isList = mode === 'list';

        // 1. SQL СТРОИТЕЛЬ
        const distFormula = Prisma.sql`(6371 * acos(cos(radians(${lat})) * cos(radians(o.lat)) * cos(radians(o.lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(o.lat))))`;

        const categoryCondition = categoryId
            ? Prisma.sql`EXISTS (SELECT 1 FROM "order_category" oc WHERE oc."orderId" = o.id AND oc."categoryId" = ${categoryId})`
            : skillIds.length > 0
                ? Prisma.sql`EXISTS (SELECT 1 FROM "order_category" oc WHERE oc."orderId" = o.id AND oc."categoryId" = ANY(${skillIds}))`
                : Prisma.sql`TRUE`;

        const cursorCondition = (isList && cursor)
            ? (() => {
                const [cDate, cId] = cursor.split('|');
                return Prisma.sql`(o."createdAt", o.id) < (${cDate}::timestamp, ${cId})`;
            })()
            : Prisma.sql`TRUE`;

        // 2. ВЫПОЛНЕНИЕ ЗАПРОСОВ
        const [raw, countResult] = await Promise.all([
            prisma.$queryRaw<RawSQL[]>`
        SELECT 
          o.*, 
          EXISTS (
            SELECT 1 FROM "order_category" oc 
            WHERE oc."orderId" = o.id AND oc."categoryId" = ANY(${skillIds})
          ) as is_match_sql
          ${isList ? Prisma.sql`, 
            l.name as loc_name, l.slug as loc_slug, ${distFormula} AS distance,
            (SELECT COUNT(*)::int FROM "order" WHERE "clientId" = o."clientId") as total_p,
            (SELECT COUNT(*)::int FROM "order" WHERE "clientId" = o."clientId" AND "status" = 'COMPLETED') as comp_p,
            (SELECT COUNT(*)::int FROM "offer" WHERE "orderId" = o.id) as off_c
          ` : Prisma.empty}
        FROM "order" o
        ${isList ? Prisma.sql`LEFT JOIN "location" l ON l.id = o."locationId"` : Prisma.empty}
        WHERE o.status = 'PENDING'
          AND ${distFormula} <= ${radius}
          AND ${categoryCondition}
          AND ${cursorCondition}
        ORDER BY o."createdAt" DESC, o.id DESC 
        LIMIT ${isList ? limit : 1000}
      `,
            prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int as count FROM "order" o 
        WHERE o.status = 'PENDING' AND ${distFormula} <= ${radius} AND ${categoryCondition}
      `
        ]);

        if (!raw.length) {
            return { orders: [] as GetOrdersResponse<T>['orders'], nextCursor: null, total: 0 };
        }

        // 3. ПАКЕТНАЯ ЗАГРУЗКА (БЕЗ ANY)
        const orderIds = raw.map(o => o.id);
        const clientIds = raw.map(o => o.clientId);

        const [allCategories, allClients] = isList
            ? await Promise.all([
                prisma.orderCategory.findMany({
                    where: { orderId: { in: orderIds } },
                    include: { category: { select: { id: true, name: true, slug: true } } }
                }),
                prisma.user.findMany({
                    where: { id: { in: clientIds } },
                    select: { id: true, name: true, image: true }
                })
            ])
            : [[], []];

        // 4. МАППИНГ (ИСПОЛЬЗУЕМ ТЕРНАРНУЮ ТИПИЗАЦИЮ)
        const orders = raw.map((o): T extends 'list' ? FeedOrder : BaseOrder => {
            const base: BaseOrder = {
                ...o, // slug, title, description здесь
                price: Number(o.price),
                distance: o.distance ? Math.round(Number(o.distance) * 10) / 10 : null,
                isMatch: !!o.is_match_sql,
                offersCount: Number(o.off_c || 0),

            };

            if (mode === 'map') {
                return base as T extends 'list' ? FeedOrder : BaseOrder;
            }

            // Гарантируем тип FeedOrder для режима списка
            const feedItem: FeedOrder = {
                ...base,
                location: o.loc_name ? { name: o.loc_name, slug: o.loc_slug || "" } : null,
                client: allClients.find(c => c.id === o.clientId) || null,
                clientStats: {
                    projects: Number(o.total_p || 0),
                    hireRate: o.total_p && o.total_p > 0 ? Math.round((Number(o.comp_p || 0) / o.total_p) * 100) : 0
                },
                categories: allCategories
                    .filter(c => c.orderId === o.id)
                    .map(c => ({ categoryId: c.categoryId, category: c.category }))
            };

            return feedItem as T extends 'list' ? FeedOrder : BaseOrder;
        });

        const nextCursor = (isList && orders.length === limit)
            ? `${raw[raw.length - 1].createdAt.toISOString()}|${raw[raw.length - 1].id}`
            : null;

        return {
            orders: orders as GetOrdersResponse<T>['orders'],
            nextCursor,
            total: Number(countResult[0]?.count || 0)
        };
    });
}
