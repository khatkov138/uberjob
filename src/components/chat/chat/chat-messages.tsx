"use client"

import * as React from "react"
import { MessageWithSender } from "@/lib/types/chat"
import { MessageBubble } from "./message-bubble"
import { Loader2 } from "lucide-react"

interface ChatMessagesProps {
  messages: MessageWithSender[]
  currentUserId: string
  partnerName: string | null
  isTyping: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  topAnchorRef: (node: HTMLDivElement | null) => void
  onRead: () => void
}

export function ChatMessages({
  messages,
  currentUserId,
  partnerName,
  isTyping,
  isFetchingNextPage,
  hasNextPage,
  topAnchorRef,
  onRead,
}: ChatMessagesProps) {

  // Обзервер для прочтения
  const readAnchorRef = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onRead()
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px 50px 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [onRead])

  return (
    <div className="flex flex-col-reverse w-full min-h-full pb-10">

      {/* 1. СТАБИЛИЗАТОР СКРОЛЛА (Самый низ) */}
      {/* Этот элемент — единственный якорь. Он всегда в 0 и его высота не меняется. */}
      <div
        className="h-px w-full shrink-0"
        style={{ overflowAnchor: 'auto' }}
      />

      {/* 2. МАЯЧОК ПРОЧТЕНИЯ */}
      <div
        ref={readAnchorRef}
        className="h-px w-full shrink-0 opacity-0"
        style={{ overflowAnchor: 'none' }}
      />

      {/* 3. ИНДИКАТОР ПЕЧАТИ */}
      <div className="h-10 shrink-0 flex items-center px-6 md:px-10" style={{ overflowAnchor: 'none' }}>
        {isTyping && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="flex gap-1 bg-slate-100 px-3 py-2 rounded-[1.2rem] rounded-tl-none border border-slate-200/50">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
            </div>
            <span className="text-[9px] font-black uppercase italic text-blue-600 opacity-70">
              {partnerName} печатает
            </span>
          </div>
        )}
      </div>

      {/* 4. СПИСОК СООБЩЕНИЙ */}
      {messages.map((msg, index) => {
        const isMe = msg.senderId === currentUserId
        const isFirstInGroup = !messages[index + 1] || messages[index + 1].senderId !== msg.senderId
        const isLastInGroup = !messages[index - 1] || messages[index - 1].senderId !== msg.senderId

        return (
          <div
            key={msg.id}
            className="message-bubble-wrapper w-full"
          >
            <MessageBubble
              msg={msg}
              isMe={isMe}
              isFirst={isFirstInGroup}
              isLast={isLastInGroup}
            />
          </div>
        )
      })}

      {/* 5. ВЕРХНЯЯ ЧАСТЬ (История) */}
      <div className="h-20 flex items-center justify-center shrink-0" style={{ overflowAnchor: 'none' }}>
        {isFetchingNextPage && (
          <Loader2 className="animate-spin text-blue-600 opacity-40" size={20} />
        )}
      </div>

      {hasNextPage && (
        <div
          ref={topAnchorRef}
          className="h-px w-full shrink-0"
          style={{ overflowAnchor: 'none' }}
        />
      )}
    </div>
  )
}
