import { getUserDialogs } from "@/actions/chat/message";
import { ChatList } from "./chat-list";
import { ChatWindow } from "./chat-window";
import { getServerSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function MessagesPage({
  searchParams
}: {
  searchParams: Promise<{ userId?: string, orderId?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user) redirect("/sign-in")

  const { userId, orderId } = await searchParams

  const [partner, orderInfo] = await Promise.all([
    userId
      ? prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, image: true },
      })
      : null,
    orderId // Запрос заказа идет только если есть ID
      ? prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, title: true, clientId: true, status: true },
      })
      : null,
  ]);

  const initialDialogs = await getUserDialogs()

  return (
    <div className="flex-1 h-full w-full flex flex-col overflow-hidden p-4 md:p-10 bg-slate-50/30">
      <div className="flex-1 w-full max-w-7xl mx-auto bg-white flex flex-row overflow-hidden border-2 border-slate-100 rounded-[3rem] shadow-2xl">

        {/* ЛЕВАЯ ПАНЕЛЬ (Без изменений) */}
        <aside className="w-80 md:w-96 border-r border-slate-100 flex flex-col h-full bg-slate-50/50 shrink-0">
          <div className="p-8 border-b border-slate-100 bg-white shrink-0">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Чаты</h1>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <ChatList currentUserId={session.user.id} activeUserId={userId} initialData={initialDialogs} />
          </div>
        </aside>

        {/* ОКНО СООБЩЕНИЙ: Теперь проверяем только наличие партнера */}
        <main className="flex-1 flex flex-col bg-white h-full overflow-hidden relative min-w-0">
          {partner ? (
            <ChatWindow
              partner={partner}
              order={orderInfo} // Передаем заказ, если он есть
              currentUserId={session.user.id}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20 grayscale">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center mb-6 italic font-black text-4xl shadow-inner text-slate-400">?</div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">Выберите диалог</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
