// src/lib/server-utils.ts
"use server"
import { getServerSession } from "./get-session";

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
