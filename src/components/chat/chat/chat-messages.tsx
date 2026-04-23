"use client"

import * as React from "react"
import { MessageWithSender } from "@/lib/types/chat"

import { cn } from "@/lib/utils"
import { MessageBubble } from "./message-bubble"

interface ChatMessagesProps {
  messages: MessageWithSender[]
  currentUserId: string
  partnerName: string | null
  isTyping: boolean
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

export function ChatMessages({
  messages,
  currentUserId,
  partnerName,
  isTyping,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: ChatMessagesProps) {
  return (
    <div className="flex flex-col gap-1 pb-10">
      {/* КНОПКА ЗАГРУЗКИ ИСТОРИИ */}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-6 text-[8px] font-black uppercase text-slate-300 hover:text-blue-600 italic tracking-[0.3em] transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? "Загрузка истории..." : "Показать предыдущие сообщения"}
        </button>
      )}

      {/* СПИСОК СООБЩЕНИЙ */}
      {messages.map((msg, index) => {
        const isMe = msg.senderId === currentUserId
        const prevMsg = messages[index - 1]
        const nextMsg = messages[index + 1]

        // Логика группировки: 
        // 1. Сменился автор? 
        // 2. Прошло больше 5 минут между сообщениями?
        const isFirstInGroup =
          !prevMsg ||
          prevMsg.senderId !== msg.senderId ||
          new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000

        const isLastInGroup =
          !nextMsg ||
          nextMsg.senderId !== msg.senderId ||
          new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000

        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMe={isMe}
            isFirst={isFirstInGroup}
            isLast={isLastInGroup}
          />
        )
      })}

      {/* ИНДИКАТОР ПЕЧАТАЕТ */}
      {isTyping && (
        <div className="flex flex-col items-start mt-4 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 px-3 py-2.5 rounded-[1.2rem] rounded-tl-none">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-duration:0.6s]" />
            </div>
            <span className="text-[9px] font-black uppercase italic text-blue-600 tracking-widest opacity-70">
              {partnerName || "Пользователь"} печатает
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
