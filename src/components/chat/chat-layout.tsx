"use client"


import { ChatView } from "./chat/chat-view";
import { ChatDialog } from "@/lib/types/chat";
import { DialogList } from "./dialog/dialog-list";

interface ChatLayoutProps {
  currentUserId: string;
  partner: any; // Твой тип пользователя
  order: any;   // Твой тип заказа
  initialDialogs: ChatDialog[];
}

export function ChatLayout({ currentUserId, partner, order, initialDialogs }: ChatLayoutProps) {
  return (
    <div className="flex-1 h-full w-full flex flex-col overflow-hidden p-4 md:p-10 bg-slate-50/30">
      <div className="flex-1 w-full max-w-7xl mx-auto bg-white flex flex-row overflow-hidden border-2 border-slate-100 rounded-[3rem] shadow-2xl">
        
        {/* ЛЕВАЯ ПАНЕЛЬ: Список всех диалогов */}
        <aside className="w-80 md:w-96 border-r border-slate-100 flex flex-col h-full bg-slate-50/50 shrink-0">
          <div className="p-8 border-b border-slate-100 bg-white shrink-0">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
              Чаты
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <DialogList 
              currentUserId={currentUserId} 
              activeUserId={partner?.id} 
              initialData={initialDialogs} 
            />
          </div>
        </aside>

        {/* ПРАВАЯ ПАНЕЛЬ: Окно переписки или пустой стейт */}
        <main className="flex-1 flex flex-col bg-white h-full overflow-hidden relative min-w-0">
          {partner ? (
            <ChatView
              partner={partner}
              order={order}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20 grayscale">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center mb-6 italic font-black text-4xl shadow-inner text-slate-400">
                ?
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">
                Выберите диалог из списка
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
