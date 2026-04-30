// src/app/api/user/heartbeat/route.ts
import prisma from "@/lib/prisma";
import { withApiAuth } from "@/lib/server-utils";

export async function POST() {
    return withApiAuth(async (userId) => {
        return await prisma.profile.update({
            where: { userId },
            data: { lastSeen: new Date() },
            select: { id: true }
        });
    });
}
