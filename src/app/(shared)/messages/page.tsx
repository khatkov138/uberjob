import { getServerSession } from "@/lib/get-session"

import { Container } from "@/components/shared/container"
import { redirect } from "next/navigation"
import { getUserDialogs } from "@/actions/chat/message"
import { ChatList } from "./chat-list"
import { ChatWindow } from "./chat-window"

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
    <Container className="bg-white h-[calc(100vh-120px)] flex overflow-hidden !p-0 border border-slate-100 rounded-[2.5rem] shadow-sm">
      {/* ЛЕВАЯ ЧАСТЬ */}
      <aside className="w-80 md:w-96 border-r border-slate-100 flex flex-col bg-slate-50/30">
        <div className="p-8 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Чаты</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <ChatList 
            currentUserId={session.user.id} 
            activeUserId={userId} 
            initialData={initialDialogs} // Прокидываем данные
          />
        </div>
      </aside>

      {/* ПРАВАЯ ЧАСТЬ */}
      <main className="flex-1 flex flex-col bg-white relative">
        {userId ? (
          <ChatWindow 
            recipientId={userId} 
            orderId={orderId} 
            currentUserId={session.user.id} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20 grayscale">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 italic font-black text-2xl">?</div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Выберите диалог</p>
          </div>
        )}
      </main>
    </Container>
  )
}
