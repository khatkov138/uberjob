"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock } from "lucide-react"
import { MessageWithSender } from "@/lib/types/chat"

interface MessageBubbleProps {
    msg: MessageWithSender
    isMe: boolean
    isFirst: boolean // Начало группы (нужен большой отступ и стандартный угол)
    isLast: boolean  // Конец группы (нужно время и галочки)
}

export function MessageBubble({ msg, isMe, isFirst, isLast }: MessageBubbleProps) {
    return (
        <div
            className={cn(
                "flex flex-col max-w-[85%] md:max-w-[70%] transition-all duration-300",
                isMe ? "ml-auto items-end" : "items-start",
                isFirst ? "mt-6" : "mt-0.5" // Группируем сообщения плотнее внутри пачки
            )}
        >
            <div
                className={cn(
                    "px-5 py-3 text-[13px] font-bold italic tracking-tight shadow-sm w-fit break-words transition-all duration-500",
                    isMe
                        ? cn(
                            "bg-blue-600 text-white rounded-[2rem] shadow-lg shadow-blue-50/50",
                            // Если сообщение в середине или в начале группы — сглаживаем углы со стороны хвоста
                            !isFirst && "rounded-tr-lg",
                            !isLast && "rounded-br-lg"
                        )
                        : cn(
                            "bg-white border-2 border-slate-50 text-slate-900 rounded-[2rem]",
                            !isFirst && "rounded-tl-lg",
                            !isLast && "rounded-bl-lg",
                            // Подсвечиваем непрочитанные входящие (опционально)
                            !msg.isRead && "border-blue-50 bg-slate-50/50"
                        ),
                    // Стили для оптимистичного (отправляемого) сообщения
                    msg.isOptimistic && "opacity-70 scale-[0.98] grayscale-[0.5]"
                )}
            >
                {msg.text}
            </div>

            {/* Индикаторы времени и статуса показываем только под ПОСЛЕДНИМ сообщением в группе */}
            {isLast && (
                <div className="flex items-center gap-1.5 mt-1.5 px-3 opacity-30 text-[8px] font-black uppercase italic tracking-tighter">
                    <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>

                    {isMe && (
                        <div className="flex items-center">
                            {msg.isOptimistic ? (
                                <Clock size={9} className="animate-pulse" />
                            ) : msg.isRead ? (
                                <CheckCheck size={11} className="text-blue-600" />
                            ) : (
                                <Check size={11} />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
