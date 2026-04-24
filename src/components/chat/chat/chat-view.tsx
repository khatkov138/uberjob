"use client"

import * as React from "react"
import { useChat } from "@/hooks/use-chat"

import { ChatInput } from "./chat-input"
import { Loader2, ChevronDown, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChatMessages } from "./chat-messages"

interface ChatViewProps {
    partner: {
        id: string
        name: string | null
        image: string | null
    }
    order: {
        id: string
        title: string
        clientId: string
        status: string
    } | null
    currentUserId: string
}

export function ChatView({ partner, order, currentUserId }: ChatViewProps) {
    // Весь "интеллект" и данные приходят из нашего кастомного хука
    const c = useChat(partner.id, order?.id, currentUserId)

    // Инициализация позиции скролла при первой загрузке
    React.useLayoutEffect(() => {
        // Убираем проверку c.messages.length > 0
        if (!c.isLoading) {
            const timer = setTimeout(() => {
                c.scrollToBottom("auto");
                c.setIsReady(true); // Теперь чат готов, даже если он пустой
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [c.isLoading]);


    return (
        <div className="flex-1 flex flex-col bg-white h-full overflow-hidden relative min-w-0">
            {/* HEADER: Стилизованная шапка с информацией о партнере и заказе */}
            <header className="px-10 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-20 shadow-sm">
                <Link
                    href={`/profile/${partner.id}`}
                    className="flex items-center gap-4 group text-left transition-transform active:scale-95"
                >
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden shadow-lg group-hover:bg-blue-600 transition-all duration-500">
                        {partner.image ? (
                            <img src={partner.image} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <span className="text-white font-black italic text-lg">
                                {partner.name?.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-black uppercase italic text-slate-900 leading-none truncate max-w-[200px]">
                            {partner.name}
                        </h2>
                        <p className="text-[10px] font-black uppercase text-slate-400 mt-1 italic tracking-tighter">
                            Профиль пользователя
                        </p>
                    </div>
                </Link>

                {order && (
                    <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2 max-w-[250px] animate-in fade-in zoom-in duration-500">
                        <Zap size={14} className="text-blue-600 fill-blue-600 shrink-0" />
                        <span className="text-[9px] font-black uppercase text-blue-600 italic truncate tracking-tight">
                            Заказ: {order.title}
                        </span>
                    </div>
                )}
            </header>

            {/* BODY: Область сообщений */}
            <div className="flex-1 relative bg-slate-50/20 overflow-hidden flex flex-col">
                {c.isLoading && !c.isReady && (
                    <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600 opacity-20 w-10 h-10" />
                    </div>
                )}

                <div
                    ref={c.scrollRef}
                    onScroll={c.handleScroll}
                    className={cn(
                        "absolute inset-0 overflow-y-auto p-6 md:p-10 chat-scrollbar transition-opacity duration-500",
                        c.isReady ? "opacity-100" : "opacity-0"
                    )}
                >
                    <ChatMessages
                        messages={c.messages}
                        currentUserId={currentUserId}
                        partnerName={partner.name}
                        isTyping={c.isTyping}
                        fetchNextPage={c.fetchNextPage}
                        hasNextPage={c.hasNextPage}
                        isFetchingNextPage={c.isFetchingNextPage}
                    />
                </div>

                {/* FLOATING BUTTON: Кнопка скролла вниз с баджем */}
                {c.showScrollButton && (
                    <button
                        onClick={() => c.scrollToBottom("smooth")}
                        className="absolute bottom-6 right-8 w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 z-30 transition-all hover:border-blue-200 group"
                    >
                        <ChevronDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
                        {c.unreadCount > 0 && (
                            <div className="absolute -top-3 -left-3 bg-blue-600 text-white min-w-[24px] h-6 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white animate-bounce shadow-lg">
                                {c.unreadCount}
                            </div>
                        )}
                    </button>
                )}
            </div>

            {/* INPUT: Компонент ввода */}
            <ChatInput
                value={c.input}
                onChange={c.handleInputChange}
                onSend={c.handleSendMessage}
                isPending={c.mutation.isPending}
                disabled={!c.hasClientStarted}
            />
        </div>
    )
}
