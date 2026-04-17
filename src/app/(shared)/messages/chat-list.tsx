"use client"

import { useQuery } from "@tanstack/react-query"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { MessageSquare } from "lucide-react"
import { getUserDialogs } from "@/actions/chat/message"

interface ChatListProps {
  currentUserId: string
  activeUserId?: string
  initialData: any[] // Типизируй под свой Order/Message если нужно
}

export function ChatList({ currentUserId, activeUserId, initialData }: ChatListProps) {
  // TanStack Query подхватывает initialData и не показывает лоадер при первой загрузке
  const { data: dialogs } = useQuery({
    queryKey: ["dialogs"],
    queryFn: () => getUserDialogs(),
    initialData: initialData,
    refetchInterval: 4000, // Обновляем список каждые 4 сек
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
      {dialogs.map((d) => {
        const isActive = activeUserId === d.otherUser.id
        
        return (
          <Link
            key={d.id}
            href={`/messages?userId=${d.otherUser.id}${d.orderId ? `&orderId=${d.orderId}` : ''}`}
            className={cn(
              "p-6 border-b border-slate-100 transition-all flex items-center gap-4 relative overflow-hidden group",
              isActive ? "bg-white" : "hover:bg-white/60 bg-transparent"
            )}
          >
            {/* АКТИВНЫЙ МАРКЕР */}
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />}

            {/* АВАТАР */}
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-white shrink-0 transition-transform group-hover:scale-105 shadow-sm",
              isActive ? "bg-blue-600" : "bg-slate-900"
            )}>
              {d.otherUser.name?.charAt(0).toUpperCase()}
            </div>

            {/* ТЕКСТ */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[11px] font-black uppercase italic text-slate-900 truncate pr-2">
                  {d.otherUser.name}
                </p>
                <span className="text-[8px] font-bold text-slate-300 uppercase shrink-0">
                  {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <p className={cn(
                "text-[10px] font-bold truncate uppercase tracking-tight leading-none",
                isActive ? "text-blue-600" : "text-slate-400"
              )}>
                {d.lastMessage}
              </p>

              {d.orderTitle && (
                <div className="mt-2.5 flex items-center gap-1.5 opacity-30">
                  <div className="w-1 h-1 bg-blue-600 rounded-full" />
                  <span className="text-[7px] font-black uppercase tracking-widest truncate max-w-[120px] italic">
                    {d.orderTitle}
                  </span>
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
