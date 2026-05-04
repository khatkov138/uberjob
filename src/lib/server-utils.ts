// src/lib/server-utils.ts
"use server"
import { NextResponse } from "next/server";
import { getServerSession } from "./get-session";
import { headers } from "next/headers";
import { auth } from "./auth";
import { cookies } from "next/headers"
import { DEFAULT_LOCATION, roundCoord } from "@/lib/location-config"
import { cache } from "react";



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




export const getServerLocation = cache(async () => {
    const cookieStore = await cookies()
    const locationRaw = cookieStore.get("user-location-storage")?.value

    // 1. Если кук нет — отдаем дефолт
    if (!locationRaw) return { ...DEFAULT_LOCATION }

    try {
        // 2. Декодируем и парсим JSON из Zustand persist
        const parsed = JSON.parse(decodeURIComponent(locationRaw))
        const state = parsed?.state

        if (state) {
            return {
                city: state.city ?? DEFAULT_LOCATION.city,
                slug: state.slug ?? DEFAULT_LOCATION.slug,
                lat: roundCoord(state.lat ?? DEFAULT_LOCATION.lat),
                lng: roundCoord(state.lng ?? DEFAULT_LOCATION.lng),
                radius: Number(state.radius ?? DEFAULT_LOCATION.radius),
                yandexUri: state.yandexUri ?? DEFAULT_LOCATION.yandexUri
            }
        }
    } catch (e) {
        console.error("ZWORK_SERVER_LOCATION_ERROR:", e)
    }

    // 3. Фолбэк на дефолт при ошибке парсинга
    return { ...DEFAULT_LOCATION }
})

export type ServerLocation = Awaited<ReturnType<typeof getServerLocation>>;

