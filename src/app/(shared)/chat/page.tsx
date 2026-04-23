import { getUserDialogs } from "@/actions/chat/message";
import { ChatView } from "@/components/chat/chat/chat-view";
import { DialogList } from "@/components/chat/dialog/dialog-list";
import { MessengerLayout } from "@/components/chat/messenger-layout";

import { getServerSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ChatPage({
    searchParams
}: {
    searchParams: Promise<{ userId?: string, orderId?: string }>
}) {
    const session = await getServerSession();
    if (!session?.user) redirect("/sign-in");

    const { userId, orderId } = await searchParams;

    // Загружаем данные параллельно для скорости
    const [partner, orderInfo, initialDialogs] = await Promise.all([
        userId ? prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, image: true },
        }) : null,
        orderId ? prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, title: true, clientId: true, status: true },
        }) : null,
        getUserDialogs() // Получаем список всех диалогов пользователя
    ]);

    return (
        <MessengerLayout
            sidebar={
                <DialogList
                    currentUserId={session.user.id}
                    activeUserId={userId}
                    initialData={initialDialogs}
                />
            }
        >
            {partner ? (
                <ChatView
                    partner={partner}
                    order={orderInfo}
                    currentUserId={session.user.id}
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20 grayscale">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center mb-6 italic font-black text-4xl shadow-inner text-slate-400">
                        ?
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
                        Выберите диалог из списка слева
                    </p>
                </div>
            )}
        </MessengerLayout>
    );
}
