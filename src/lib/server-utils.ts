// src/lib/server-utils.ts
"use server"
import { NextResponse } from "next/server";
import { getServerSession } from "./get-session";
import { headers } from "next/headers";
import { auth } from "./auth";

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