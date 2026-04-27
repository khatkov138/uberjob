import { getUserDialogs } from "@/actions/message/get";
import { ChatLayout } from "@/components/chat/chat-layout";
import { getServerSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";
import { unwrap } from "@/lib/utils";

import { redirect, notFound } from "next/navigation";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; orderId?: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) redirect("/sign-in");

  const { userId, orderId } = await searchParams;
  const currentUserId = session.user.id;

  // 1. Параллельная загрузка
  const [partner, order, initialDialogsResponse] = await Promise.all([
    userId ? prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true },
    }) : null,
    orderId ? prisma.order.findUnique({
      where: { id: orderId },
      // clientId и workerId нужны для проверки прав доступа
      select: { id: true, title: true, clientId: true, workerId: true, status: true },
    }) : null,
    getUserDialogs() // Этот экшен уже возвращает ActionResponse благодаря createAuthAction
  ]);

  // 2. Проверка безопасности: если есть заказ, юзер должен быть его участником
  if (order && order.clientId !== currentUserId && order.workerId !== currentUserId) {
    // Если юзер "левый", не показываем ему детали заказа
    return notFound();
  }

  // 3. Если userId был в URL, но партнера не нашли — 404
  if (userId && !partner) return notFound();

  return (
    <ChatLayout
      currentUserId={currentUserId}
      partner={partner}
      order={order}
      // unwrap гарантирует, что даже при ошибке в БД будет пустой массив
      initialDialogs={unwrap(initialDialogsResponse, [])}
    />
  );
}
