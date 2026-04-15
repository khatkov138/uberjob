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
            setTimeout(() => scrollToBottom("smooth"), 100)
        }
    })

    const handleSend = () => {
        if (!text.trim() || mutation.isPending) return
        mutation.mutate({ orderId, recipientId: workerId, text: text.trim() })
    }

    return (
       <div className="flex flex-col h-full min-h-0 bg-white relative">

            {/* 1. ОБЛАСТЬ СООБЩЕНИЙ (Скроллится) */}
            <div
                ref={scrollAreaRef}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/10 no-scrollbar min-h-0"
            >
                <div className="max-w-2xl mx-auto space-y-6 pt-4 pb-10">
                    {messages?.map((msg: any) => {
                        const isMe = msg.senderId === currentUserId
                        return (
                            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "max-w-[85%] p-4 px-6 rounded-3xl text-[15px] font-medium transition-all border break-words",
                                    isMe 
                                        ? "bg-blue-600 text-white border-blue-600 rounded-br-none shadow-sm" 
                                        : "bg-white text-slate-900 border-slate-200 rounded-bl-none shadow-sm"
                                )}>
                                    {msg.text}
                                </div>
                                <span className="text-[9px] font-black uppercase text-slate-300 mt-2 px-3 tracking-widest">
                                    {format(new Date(msg.createdAt), "HH:mm")}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 2. ПАНЕЛЬ ВВОДА (Жестко внизу) */}
            <div className="flex-none p-4 md:p-6 bg-white border-t border-slate-100 z-10">
                <div className="max-w-2xl mx-auto">
                    <div className="relative flex items-center gap-3 bg-slate-50 p-2 pl-5 rounded-2xl border-2 border-slate-100 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/5">
                        <input
                            className="flex-1 h-12 bg-transparent outline-none font-medium text-slate-900 placeholder:text-slate-400 text-sm"
                            placeholder="Напишите сообщение..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            disabled={!text.trim() || mutation.isPending}
                            onClick={handleSend}
                            className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
                                text.trim() 
                                    ? "bg-slate-900 text-white hover:bg-blue-600 active:scale-95 shadow-md" 
                                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            )}
                        >
                            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
