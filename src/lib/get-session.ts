

import { cache } from "react";
import { Role } from "../../prisma/generated";
import { auth } from "./auth";
import { headers } from "next/headers";

export const getServerSession = cache(async () => {
    const sessionData = await auth.api.getSession({
        headers: await headers(),
    });
    console.log('getServerSession')
    if (!sessionData) return null;

    return {
        ...sessionData,
        user: {
            ...sessionData.user,
            // Принудительно приводим роль к Enum, так как в БД у нас есть дефолт
            role: (sessionData.user.role as Role) || Role.CLIENT,
        },
    };
})