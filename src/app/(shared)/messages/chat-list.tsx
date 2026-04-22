"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MessageSquare, Zap } from "lucide-react"
import { ChatDialog, getUserDialogs } from "@/actions/chat/message"

interface ChatListProps {
  currentUserId: string
  activeUserId?: string
  initialData: ChatDialog[]
}

export function ChatList({ activeUserId, initialData }: ChatListProps) {
  const { data: dialogs } = useQuery({
    queryKey: ["dialogs"],
    queryFn: () => getUserDialogs(),
    initialData: initialData,
  })

  if (!dialogs || dialogs.length === 0) {
    return (
      <div className="p-12 text-center opacity-20 grayscale">
        <MessageSquare className="mx-auto mb-3" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Переписок нет</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {dialogs?.map((d) => {
        if (!d.partner || !d.lastMessage) return null;

        const isActive = activeUserId === d.partner.id;
        const hasUnread = d.unreadCount > 0;
        // Проверяем наличие заказа в диалоге
        const orderTitle = (d as any).order?.title; 

        return (
          <Link
            key={d.lastMessage.id}
            href={`/messages?userId=${d.partner.id}${d.lastMessage.orderId ? `&orderId=${d.lastMessage.orderId}` : ''}`}
            className={cn(
              "p-6 border-b border-slate-100 transition-all flex items-center gap-4 relative overflow-hidden group",
              isActive ? "bg-white shadow-inner" : "hover:bg-white/60 bg-transparent"
            )}
          >
            {/* ИНДИКАТОР АКТИВНОСТИ В СТИЛЕ ZWORK */}
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600" />}

            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-white shrink-0 shadow-lg transition-transform group-hover:scale-105",
              isActive ? "bg-blue-600 rotate-3" : "bg-slate-900 -rotate-3"
            )}>
              {d.partner.image ? (
                <img src={d.partner.image} className="w-full h-full object-cover rounded-2xl" alt="" />
              ) : (
                d.partner.name?.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase italic text-slate-900 truncate">
                    {d.partner.name}
                  </p>
                  {/* ПОДЗАСГОЛОВОК С ЗАКАЗОМ */}
                  {orderTitle && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Zap size={8} className="text-blue-600 fill-blue-600" />
                      <p className="text-[8px] font-black uppercase text-blue-600 italic truncate tracking-tight">
                        {orderTitle}
                      </p>
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase shrink-0 mt-1 italic",
                  hasUnread ? "text-blue-600" : "text-slate-300"
                )}>
                  {new Date(d.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <p className={cn(
                  "text-[10px] font-bold truncate uppercase tracking-tighter leading-none flex-1 italic",
                  isActive ? "text-slate-900" : "text-slate-400"
                )}>
                  {d.lastMessage.text}
                </p>

                {hasUnread && (
                  <div className="bg-blue-600 text-white text-[9px] font-black min-w-[20px] h-[20px] px-1 rounded-lg flex items-center justify-center animate-bounce shadow-lg shadow-blue-200">
                    {d.unreadCount}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  )
}
