"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MessageSquare } from "lucide-react"
import { ChatDialog, getUserDialogs } from "@/actions/chat/message"
import Pusher from "pusher-js"

interface ChatListProps {
  currentUserId: string
  activeUserId?: string
  initialData: ChatDialog[]
}

export function ChatList({ currentUserId, activeUserId, initialData }: ChatListProps) {

  const { data: dialogs } = useQuery({
    queryKey: ["dialogs"],
    queryFn: () => getUserDialogs(),
    initialData: initialData,
  })


  if (!dialogs || dialogs.length === 0) {
    return (
      <div className="p-12 text-center opacity-20">
        <MessageSquare className="mx-auto mb-3" size={32} />
        <p className="text-[9px] font-black uppercase tracking-widest">Переписок нет</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {dialogs?.map((d) => {
        // Используем d.partner вместо d.otherUser
        if (!d.partner || !d.lastMessage) return null;

        const isActive = activeUserId === d.partner.id;
        const hasUnread = d.unreadCount > 0;

        return (
          <Link
            key={d.lastMessage.id} // ID последнего сообщения отлично подходит для ключа
            href={`/messages?userId=${d.partner.id}${d.lastMessage.orderId ? `&orderId=${d.lastMessage.orderId}` : ''}`}
            className={cn(
              "p-6 border-b border-slate-100 transition-all flex items-center gap-4 relative overflow-hidden group",
              isActive ? "bg-white" : "hover:bg-white/60 bg-transparent"
            )}
          >
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}

            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-white shrink-0",
              isActive ? "bg-blue-600" : "bg-slate-900"
            )}>
              {d.partner.name?.charAt(0).toUpperCase() || "?"}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[11px] font-black uppercase italic text-slate-900 truncate pr-2">
                  {d.partner.name}
                </p>
                <span className={cn(
                  "text-[8px] font-bold uppercase shrink-0",
                  hasUnread ? "text-blue-600" : "text-slate-300"
                )}>
                  {new Date(d.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex justify-between items-end gap-2">
                <p className={cn(
                  "text-[10px] font-bold truncate uppercase tracking-tight leading-none flex-1",
                  isActive ? "text-blue-600" : "text-slate-400"
                )}>
                  {/* Используем d.lastMessage.text */}
                  {d.lastMessage.text}
                </p>

                {hasUnread && (
                  <div className="bg-blue-600 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
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