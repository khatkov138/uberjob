"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MessageWithSender } from "@/lib/types/chat"
import { Check, CheckCheck, Clock } from "lucide-react"

interface MessageBubbleProps {
  msg: MessageWithSender
  isMe: boolean
  isFirst: boolean 
  isLast: boolean  
}

export function MessageBubble({ msg, isMe, isFirst, isLast }: MessageBubbleProps) {
  const isUnreadIncoming = !isMe && !msg.isRead;

  return (
    <div className={cn(
      "flex flex-col w-full px-4 antialiased",
      isMe ? "items-end" : "items-start",
      "pt-2" 
    )}>
      <div className={cn(
        "px-4 py-2.5 text-[13px] font-bold italic tracking-tight shadow-sm w-fit break-words border-2 relative min-w-[80px]",
        "transition-all duration-300",
        // Базовая геометрия
        "rounded-[1.4rem]",
        !isFirst && (isMe ? "rounded-tr-md" : "rounded-tl-md"),
        !isLast && (isMe ? "rounded-br-md" : "rounded-bl-md"),
        
        // Цветовая логика
        isMe 
          ? "bg-blue-600 border-blue-600 text-white" 
          : cn(
              "border-white text-slate-900",
              isUnreadIncoming ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-white"
            )
      )}>
        {msg.text}
        
        <div className="flex items-center justify-end gap-1 mt-1 opacity-40 text-[7px] font-black uppercase tracking-tighter">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isMe && (
            <div className="w-[10px]">
              {msg.isOptimistic ? <Clock size={8} /> : msg.isRead ? <CheckCheck size={10} /> : <Check size={10} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
