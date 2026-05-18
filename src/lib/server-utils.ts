// src/lib/server-utils.ts
"use server"
import { NextResponse } from "next/server";
import { getServerSession } from "./get-session";
import { headers } from "next/headers";
import { auth } from "./auth";
import { cookies } from "next/headers"

import { type RoleMode } from '@/store/use-role-store'

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
    // Читаем ту же самую куку ядра локации
    const storageRaw = cookieStore.get("zwork-core-loc")?.value;

    // Переводим внутренние переменные со старых ID на ЧПУ Слаги 🚀
    let globalSlug: string | null = null;
    let lastOrderSlug: string | null = null;

    if (storageRaw) {
        try {
            const parsed = JSON.parse(decodeURIComponent(storageRaw));

            // Извлекаем именно слаги, которые туда теперь пишет Zustand и прокси 🚀
            if (parsed?.state) {
                globalSlug = parsed.state.globalLocationSlug || null;
                lastOrderSlug = parsed.state.lastOrderLocationSlug || null;
            }
        } catch (e) {
            console.error("❌ [SERVER LOCATION HELP] Parse error:", e);
        }
    }

    // Вычисляем целевой слаг в зависимости от приоритета (lastOrder или global)
    const targetSlug = preference === 'lastOrder'
        ? (lastOrderSlug || globalSlug)
        : (globalSlug || lastOrderSlug);

    // 🚀 ИЩЕМ В БАЗЕ ДАННЫХ ПО УНИКАЛЬНОМУ СЛАГУ ВМЕСТО ID
    let dbLocation = targetSlug
        ? await prisma.location.findUnique({ where: { slug: targetSlug } })
        : null;

    // Если по слагу ничего не нашли (или кука пустая) — берем дефолтный город по yandexUri из твоего конфига
    if (!dbLocation) {
        dbLocation = await prisma.location.findUnique({
            where: { yandexUri: LOCATION_CONFIG.DEFAULT.yandexUri }
        });
    }

    // Если в базе вообще шаром покати (первый запуск на чистой БД) — создаем дефолтный город
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

    // Возвращаем объект. Форма и типы данных для остального бэкенда сохранены без изменений! 🚀
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

    // Читаем Zustand-куку с клиента (которую прокси уже синхронизировал с URL)
    const storageRaw = cookieStore.get("zwork-feed-state")?.value;

    // Инициализируем дефолты напрямую из твоего LOCATION_CONFIG
    let radius: number = LOCATION_CONFIG.SETTINGS.radius;
    let viewMode: "list" | "map" = "list";

    // Слой КУК: Перезаписываем дефолты сохраненным состоянием пользователя
    if (storageRaw) {
        try {
            // Zustand хранит данные в формате { state: { ... }, version: 0 }
            const parsed = JSON.parse(decodeURIComponent(storageRaw));

            if (parsed?.state) {
                radius = parsed.state.radius || radius;
                viewMode = parsed.state.viewMode || viewMode;
            }
        } catch (e) {
            console.error("❌ [SERVER FEED STATE] Parse error:", e);
        }
    }

    return { radius, viewMode };
});



