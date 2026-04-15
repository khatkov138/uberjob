"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getChatMessages, sendMessage } from "./actions"


export function ChatWindow({ orderId, workerId, currentUserId }: any) {
    const [text, setText] = React.useState("")
    const scrollAreaRef = React.useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()

    const { data: messages } = useQuery({
        queryKey: ["chat", orderId, workerId],
        queryFn: () => getChatMessages(orderId, workerId),
        refetchInterval: 3000,
    })

    // Умный скролл
    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior
            })
        }
    }

    React.useEffect(() => {
        if (!messages || !scrollAreaRef.current) return
        const container = scrollAreaRef.current
        // Если пользователь не сильно отскроллил вверх, докручиваем до конца
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 200
        if (isAtBottom) {
            setTimeout(() => scrollToBottom("smooth"), 100)
        }
    }, [messages])

    const mutation = useMutation({
        mutationFn: (data: any) => sendMessage(data),
        onSuccess: () => {
            setText("")
            queryClient.invalidateQueries({ queryKey: ["chat"] })
            setTimeout(() => scrollToBottom("smooth"), 100) // После своего сообщения — всегда вниз
        }
    })

    return (
        <div className="flex flex-col h-full"> {/* h-full теперь берется от родителя */}

            {/* 1. СООБЩЕНИЯ (скроллятся только они) */}
            <div
                ref={scrollAreaRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 no-scrollbar"
            >
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages?.map((msg: any) => {
                        const isMe = msg.senderId === currentUserId
                        return (
                            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "max-w-[80%] p-4 rounded-[1.5rem] text-[15px] font-medium shadow-sm",
                                    isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-slate-900 border border-slate-100 rounded-bl-none"
                                )}>
                                    {msg.text}
                                </div>
                                <span className="text-[9px] font-black uppercase text-slate-300 mt-2 px-2">
                                    {format(new Date(msg.createdAt), "HH:mm")}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 2. ПОЛЕ ВВОДА (всегда прижато к низу) */}
            <div className="flex-shrink-0 p-6 bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto relative flex items-center gap-3">
                    <input
                        className="flex-1 h-14 pl-6 pr-16 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-medium transition-all"
                        placeholder="Напишите сообщение..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && text && mutation.mutate({ orderId, recipientId: workerId, text })}
                    />
                    <button
                        disabled={!text.trim() || mutation.isPending}
                        onClick={() => mutation.mutate({ orderId, recipientId: workerId, text })}
                        className="absolute right-2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
