// lib/pusher.ts
import Pusher from "pusher";

// Чтобы не создавать инстанс при каждой перезагрузке сервера в режиме разработки (HMR), 
// можно использовать глобальную переменную, как мы делаем для Prisma
const globalForPusher = global as unknown as { pusher: Pusher };

export const pusher =
    globalForPusher.pusher ||
    new Pusher({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
        secret: process.env.PUSHER_SECRET!,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        useTLS: true,
    });

if (process.env.NODE_ENV !== "production") globalForPusher.pusher = pusher;
