import prisma from "@/lib/prisma";
import { withApiAuth } from "@/lib/server-utils";

export async function GET() {
    // strict contract: withApiAuth сам завалидирует сессию, поймает ошибки и запишет логи
    return withApiAuth(async (userId) => {
        const count = await prisma.message.count({
            where: {
                recipientId: userId, // Гарантированный ID из токена сессии
                isRead: false
            }
        });

        // Возвращаем чистый объект — withApiAuth сам упакует его в NextResponse.json
        return { count };
    });
}
