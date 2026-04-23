"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { cn, getContextKey } from "@/lib/utils"
import { ChatDialog } from "@/lib/types/chat"

interface DialogItemProps {
    dialog: ChatDialog
    isActive: boolean
    currentUserId: string
}

export function DialogItem({ dialog, isActive, currentUserId }: DialogItemProps) {
    const { partner, lastMessage, unreadCount } = dialog

    // Генерируем контекстный ключ для подписки на статус печати конкретно этого партнера
    const contextKey = React.useMemo(() =>
        getContextKey(lastMessage?.orderId, currentUserId, partner.id),
        [lastMessage?.orderId, currentUserId, partner.id]
    )

    // Подписываемся на глобальное состояние "печатает" из useNotifications
    const { data: typingData } = useQuery({
        queryKey: ["typing", contextKey],
        queryFn: () => ({ isTyping: false }),
        initialData: { isTyping: false },
        staleTime: Infinity,
    })

    const hasUnread = unreadCount > 0

    return (
        <Link
            href={`/chat?userId=${partner.id}${lastMessage?.orderId ? `&orderId=${lastMessage.orderId}` : ''}`}
            className={cn(
                "p-6 border-b border-slate-100 transition-all flex items-center gap-4 relative group overflow-hidden",
                isActive
                    ? "bg-white shadow-[inset_0px_0px_20px_rgba(0,0,0,0.02)]"
                    : "hover:bg-white/80 bg-transparent active:scale-[0.98]"
            )}
        >
            {/* ИНДИКАТОР АКТИВНОСТИ */}
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 animate-in slide-in-from-left duration-300" />
            )}

            {/* АВАТАР С ПОВОРОТОМ */}
            <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center font-black italic text-white shrink-0 shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-0",
                isActive ? "bg-blue-600 rotate-3 scale-105" : "bg-slate-900 -rotate-3"
            )}>
                {partner.image ? (
                    <img
                        src={partner.image}
                        className="w-full h-full object-cover rounded-2xl"
                        alt={partner.name || ""}
                    />
                ) : (
                    <span className="text-xl">{partner.name?.charAt(0).toUpperCase()}</span>
                )}
            </div>

            {/* КОНТЕНТ */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between items-start">
                    <p className={cn(
                        "text-[12px] font-black uppercase italic truncate transition-colors",
                        isActive ? "text-blue-600" : "text-slate-900"
                    )}>
                        {partner.name}
                    </p>
                    <span className={cn(
                        "text-[8px] font-black uppercase italic shrink-0 mt-1 transition-colors",
                        hasUnread ? "text-blue-600" : "text-slate-300"
                    )}>
                        {lastMessage && new Date(lastMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>

                <div className="flex justify-between items-center gap-3 h-4">
                    {typingData?.isTyping ? (
                        /* ИНДИКАТОР ПЕЧАТАЕТ */
                        <div className="flex items-center gap-1.5 text-blue-600 animate-in fade-in slide-in-from-left-2">
                            <div className="flex gap-0.5">
                                <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-duration:0.6s]" style={{ animationDelay: '0s' }} />
                                <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-duration:0.6s]" style={{ animationDelay: '0.15s' }} />
                                <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-duration:0.6s]" style={{ animationDelay: '0.3s' }} />
                            </div>
                            <p className="text-[9px] font-black uppercase italic tracking-widest">
                                Печатает...
                            </p>
                        </div>
                    ) : (
                        /* ПОСЛЕДНЕЕ СООБЩЕНИЕ */
                        <p className={cn(
                            "text-[10px] font-bold truncate uppercase tracking-tight flex-1 italic transition-colors",
                            isActive ? "text-slate-600" : "text-slate-400"
                        )}>
                            {lastMessage?.senderId === currentUserId && (
                                <span className="text-blue-500 mr-1.5">ВЫ:</span>
                            )}
                            {lastMessage?.text}
                        </p>
                    )}

                    {/* БАДЖ НЕПРОЧИТАННЫХ */}
                    {hasUnread && (
                        <div className="bg-blue-600 text-white text-[9px] font-black min-w-[20px] h-[20px] px-1.5 rounded-lg flex items-center justify-center animate-bounce shadow-[0_5px_15px_rgba(37,99,235,0.4)] border border-blue-400">
                            {unreadCount}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}
