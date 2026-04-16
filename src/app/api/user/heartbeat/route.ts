import { getServerSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
    const session = await getServerSession();
    
    // Если юзер не залогинен, просто выходим
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Обновляем время последней активности
    await prisma.profile.update({
        where: { userId: session.user.id },
        data: { lastSeen: new Date() }
    });

    return NextResponse.json({ success: true });
}
