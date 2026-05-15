import prisma from "@/lib/prisma";
import { withApiAuth } from "@/lib/server-utils";

export async function GET() {
    // strict contract: withApiAuth сам обработает 401, 500 и логирование ошибок
    return withApiAuth(async (userId) => {
        return await prisma.notification.findMany({
            where: {
                userId // withApiAuth гарантирует, что userId чистый и принадлежит текущей сессии
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20,
            // Сюда можно добавить select, если не нужен весь объект уведомления целиком, 
            // для максимальной разгрузки трафика сети
        });
    });
}
