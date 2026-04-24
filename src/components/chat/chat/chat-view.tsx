"use client"

import * as React from "react"
import { useChat } from "@/hooks/use-chat"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { Loader2, ChevronDown, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function ChatView({ partner, order, currentUserId }: any) {
    const c = useChat(partner.id, order?.id, currentUserId)

    return (
        <div className="flex-1 flex flex-col bg-white h-full overflow-hidden relative min-w-0">
            {/* HEADER */}
            <header className="px-10 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-20">
                <Link href={`/profile/${partner.id}`} className="flex items-center gap-4 group text-left transition-transform active:scale-95">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden shadow-lg group-hover:bg-blue-600 transition-all duration-500">
                        {partner.image ? <img src={partner.image} className="w-full h-full object-cover" alt="" /> : <span className="text-white font-black italic text-lg">{partner.name?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-black uppercase italic text-slate-900 leading-none truncate max-w-[200px]">{partner.name}</h2>
                        <p className="text-[10px] font-black uppercase text-slate-400 mt-1 italic tracking-tighter">Профиль пользователя</p>
                    </div>
                </Link>
                {order && (
                    <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2 max-w-[250px]">
                        <Zap size={14} className="text-blue-600 fill-blue-600 shrink-0" />
                        <span className="text-[9px] font-black uppercase text-blue-600 italic truncate tracking-tight">Заказ: {order.title}</span>
                    </div>
                )}
            </header>

            {/* MESSAGES AREA */}
            <div className="flex-1 relative bg-slate-50/20 overflow-hidden flex flex-col">

                {/* КРИТИЧЕСКИ ВАЖНО: Пока не готов — показываем лоадер */}
                {!c.isReady && (
                    <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600 opacity-20 w-10 h-10" />
                    </div>
                )}


                <div
                    ref={c.scrollRef}
                    onScroll={c.handleScroll}
                    className="absolute inset-0 overflow-y-auto flex flex-col-reverse chat-scrollbar"
                >
                    <ChatMessages
                        messages={c.messages}
                        currentUserId={currentUserId}
                        partnerName={partner.name}
                        isTyping={c.isTyping}
                        topAnchorRef={c.topAnchorRef}
                        onRead={c.handleRead}
                        hasNextPage={c.hasNextPage}
                        isFetchingNextPage={c.isFetchingNextPage}
                    />
                </div>

                {/* FLOATING BUTTON */}
                {c.showScrollButton && c.isReady && (
                    <button
                        onClick={() => c.scrollToBottom()}
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

            {/* INPUT */}
            <ChatInput
                value={c.input}
                onChange={c.handleInputChange}
                onSend={c.handleSendMessage}
                isPending={c.mutation.isPending}
                disabled={false}
            />
        </div>
    )
}
