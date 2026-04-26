// src/lib/server-utils.ts
"use server"
import { getServerSession } from "./get-session";

export type ActionResponse<T> =

    | { success: true; data: T; error: null }
    | { success: false; data: null; error: string };


/**
 * Для публичных действий (без проверки сессии)
 */
export async function createAction<T, R>(fn: (data: T) => Promise<R>) {
    return async (data: T): Promise<ActionResponse<R>> => {
        try {
            const result = await fn(data);
            return { success: true, data: result, error: null };
        } catch (error) {
            console.error("ACTION_ERROR:", error);
            return { success: false, data: null, error: error instanceof Error ? error.message : "Error" };
        }
    };
}

/**
 * Для защищенных действий (с проверкой сессии)
 */
// src/lib/server-utils.ts
// src/lib/server-utils.ts

export async function createAuthAction<T>(
    fn: (userId: string) => Promise<T>
): Promise<ActionResponse<T>> {
    try {
        const session = await getServerSession()
        if (!session?.user?.id) {
            return { success: false, data: null, error: "Unauthorized" }
        }

        const data = await fn(session.user.id)
        return { success: true, data, error: null }
    } catch (error) {
        console.error("AUTH_ACTION_ERROR:", error)
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : "Internal Error"
        }
    }
}

