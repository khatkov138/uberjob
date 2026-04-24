import { ChatLayout } from "@/components/chat/chat-layout";
import { getUserDialogs } from "@/actions/chat/message";
import { getServerSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; orderId?: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) redirect("/sign-in");

  const { userId, orderId } = await searchParams;

  // Параллельно грузим всё необходимое
  const [partner, order, initialDialogs] = await Promise.all([
    userId ? prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true },
    }) : null,
    orderId ? prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, title: true, clientId: true, status: true },
    }) : null,
    getUserDialogs()
  ]);

  return (
    <ChatLayout
      currentUserId={session.user.id}
      partner={partner}
      order={order}
      initialDialogs={initialDialogs}
    />
  );
}
