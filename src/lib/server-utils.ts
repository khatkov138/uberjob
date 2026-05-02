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

    // Если кук нет, сразу возвращаем дефолт из твоего конфига
    if (!locationRaw) return { ...DEFAULT_LOCATION }

    try {
        const parsed = JSON.parse(decodeURIComponent(locationRaw))
        if (parsed?.state) {
            return {
                city: parsed.state.city ?? DEFAULT_LOCATION.city,
                slug: parsed.state.slug ?? DEFAULT_LOCATION.slug, // Добавь эту строку
                lat: roundCoord(parsed.state.lat ?? DEFAULT_LOCATION.lat),
                lng: roundCoord(parsed.state.lng ?? DEFAULT_LOCATION.lng),
                radius: Number(parsed.state.radius ?? DEFAULT_LOCATION.radius)
            }
        }
    } catch (e) {
        console.error("Ошибка парсинга кук локации", e)
    }

    return { ...DEFAULT_LOCATION }
})