// src/lib/server-utils.ts
"use server"
import { NextResponse } from "next/server";
import { getServerSession } from "./get-session";
import { headers } from "next/headers";
import { auth } from "./auth";
import { cookies } from "next/headers"

import { cache } from "react";
import prisma from "./prisma";
import { LOCATION_CONFIG } from "./location-config";



export type ActionResponse<T> =

    | { success: true; data: T; error: null }
    | { success: false; data: null; error: string };



/**
 * Для публичных действий (без проверки сессии)
 */
export async function createAction<T>(fn: () => Promise<T>): Promise<ActionResponse<T>> {
    try {
        const result = await fn();
        return { success: true, data: result, error: null };
    } catch (error) {
        console.error("ACTION_ERROR:", error);
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : "Internal Error",
        };
    }
}

// 2. Авторизованная надстройка
export async function createAuthAction<T>(fn: (userId: string) => Promise<T>): Promise<ActionResponse<T>> {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return { success: false, data: null, error: "Unauthorized" };
    }

    // Просто переиспользуем базовый движок, прокидывая внутрь userId
    return createAction(() => fn(userId));
}

// Для api 
export async function createApiResponse<T>(fn: () => Promise<T>) {
    try {
        const result = await fn();
        return NextResponse.json({ success: true, data: result, error: null });
    } catch (error) {
        console.error("API_ERROR:", error);
        return NextResponse.json({
            success: false,
            data: null,
            error: error instanceof Error ? error.message : "Internal Error",
        }, { status: 500 });
    }
}

export async function withApiAuth<T>(fn: (userId: string) => Promise<T>) {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    return createApiResponse(() => fn(userId));
}


export const getServerLocation = cache(async (
    preference: 'global' | 'lastOrder' = 'global'
) => {
    const cookieStore = await cookies();
    const storageRaw = cookieStore.get("zwork-core-loc")?.value;

    let globalId: string | null = null;
    let lastOrderId: string | null = null;

    if (storageRaw) {
        try {
            const parsed = JSON.parse(decodeURIComponent(storageRaw));
            globalId = parsed?.state?.globalLocationId || null;
            lastOrderId = parsed?.state?.lastOrderLocationId || null;
        } catch (e) {
            console.error("ZWORK_LOCATION_PARSE_ERROR:", e);
        }
    }

    const targetId = preference === 'lastOrder'
        ? (lastOrderId || globalId)
        : (globalId || lastOrderId);

    let dbLocation = targetId
        ? await prisma.location.findUnique({ where: { id: targetId } })
        : null;

    if (!dbLocation) {
        dbLocation = await prisma.location.findUnique({
            where: { yandexUri: LOCATION_CONFIG.DEFAULT.yandexUri }
        });
    }

    if (!dbLocation) {
        dbLocation = await prisma.location.create({
            data: {
                name: LOCATION_CONFIG.DEFAULT.city,
                slug: LOCATION_CONFIG.DEFAULT.slug,
                yandexUri: LOCATION_CONFIG.DEFAULT.yandexUri,
                lat: LOCATION_CONFIG.DEFAULT.lat,
                lng: LOCATION_CONFIG.DEFAULT.lng
            }
        });
    }

    // Возвращаем объект. TypeScript сам выведет его форму.
    return {
        id: dbLocation.id,
        name: dbLocation.name,
        slug: dbLocation.slug,
        lat: dbLocation.lat,
        lng: dbLocation.lng,
        yandexUri: dbLocation.yandexUri,
    };
});

export type ServerLocation = Awaited<ReturnType<typeof getServerLocation>>;


export const getServerFeedState = cache(async () => {
    const cookieStore = await cookies();
    // Используем актуальный ключ для настроек фида
    const storageRaw = cookieStore.get("zwork-orders-feed-state")?.value;

    let radius = LOCATION_CONFIG.SETTINGS.radius;
    let viewMode: "list" | "map" = "list";

    if (storageRaw) {
        try {
            const parsed = JSON.parse(decodeURIComponent(storageRaw));
            const state = parsed?.state;

            if (state) {
                radius = state.radius ?? radius;
                viewMode = state.viewMode ?? viewMode;
            }
        } catch (e) {
            // Тихое игнорирование ошибок парсинга
        }
    }

    return { radius, viewMode };
});
