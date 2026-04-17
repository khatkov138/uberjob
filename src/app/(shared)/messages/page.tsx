import { getServerSession } from "@/lib/get-session"
import { Container } from "@/components/shared/container"
import { redirect } from "next/navigation"
import { getUserDialogs } from "@/actions/chat/message"
import { ChatList } from "./chat-list"
import { ChatWindow } from "./chat-window"
import { cn } from "@/lib/utils"

export default async function MessagesPage({
  searchParams
}: {
  searchParams: Promise<{ userId?: string, orderId?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user) redirect("/sign-in")

  const { userId, orderId } = await searchParams

  // Получаем начальные данные на сервере (SSR)
  const initialDialogs = await getUserDialogs()

  return (
    /**
     * h-full — заставляет контейнер растянуться на всю высоту main (до футера).
     * !p-0 — убираем внутренние паддинги контейнера, чтобы чат касался его краев.
     * overflow-hidden — гарантирует, что скроллиться будут только списки внутри.
     */
    <div className="flex-1 h-full overflow-hidden">
      <Container className={cn(
        "bg-white flex !flex-row !p-0 overflow-hidden border-2 border-slate-100 rounded-[3rem] shadow-xl",
        "h-full"
      )}>

        {/* ЛЕВАЯ ЧАСТЬ: СПИСОК ДИАЛОГОВ */}
        <aside className="w-80 md:w-96 border-r border-slate-100 flex flex-col h-full bg-slate-50/50 shrink-0">
          <div className="p-8 border-b border-slate-100 bg-white/50 shrink-0">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Чаты</h1>
          </div>
          <div className="flex-1 overflow-y-auto chat-scrollbar">
            <ChatList currentUserId={session.user.id} activeUserId={userId} initialData={initialDialogs} />
          </div>
        </aside>

        {/* ПРАВАЯ ЧАСТЬ: ОКНО СООБЩЕНИЙ */}
        <main className="flex-1 flex flex-col bg-white h-full overflow-hidden relative min-w-0">
          {userId ? (
            <ChatWindow
              recipientId={userId}
              orderId={orderId}
              currentUserId={session.user.id}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20 grayscale">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center mb-6 italic font-black text-4xl shadow-inner text-slate-400">
                ?
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
                Выберите диалог <br /> из списка слева
              </p>
            </div>
          )}
        </main>
      </Container>
    </div>
  )
}
