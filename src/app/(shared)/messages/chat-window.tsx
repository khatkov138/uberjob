"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { Send, Loader2, Zap, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import Pusher from "pusher-js"
import { getOrderMessages, sendMessage } from "@/actions/chat/message"

export function ChatWindow({ recipientId, orderId, currentUserId }: any) {
  const queryClient = useQueryClient()
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // 1. ПОЛУЧЕНИЕ СООБЩЕНИЙ
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", orderId || recipientId],
    queryFn: () => getOrderMessages(orderId || ""),
    enabled: !!recipientId,
  })

  // 2. МУТАЦИЯ ОТПРАВКИ (TanStack Mutation)
  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ recipientId, text, orderId }),
    onSuccess: (res) => {
      if (res.success) {
        setInput("")
        // Обновляем список диалогов, чтобы подтянулось превью
        queryClient.invalidateQueries({ queryKey: ["dialogs"] })
      }
    },
    // Опционально: здесь можно реализовать Optimistic Update
  })

  // 3. REAL-TIME (Pusher)
  React.useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channelName = orderId 
        ? `chat-order-${orderId}` 
        : `chat-user-${[currentUserId, recipientId].sort().join('-')}`

    const channel = pusher.subscribe(channelName)

    channel.bind("new-message", (newMessage: any) => {
      // Обновляем кэш сообщений вручную
      queryClient.setQueryData(["messages", orderId || recipientId], (old: any) => {
        const exists = old?.find((m: any) => m.id === newMessage.id)
        if (exists) return old
        return [...(old || []), newMessage]
      })
      queryClient.invalidateQueries({ queryKey: ["dialogs"] })
    })

    return () => {
      pusher.unsubscribe(channelName)
      pusher.disconnect()
    }
  }, [orderId, recipientId, currentUserId, queryClient])

  // Авто-скролл
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || mutation.isPending) return
    mutation.mutate(input)
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* ХЕДЕР ЧАТА */}
      <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black italic">
            {recipientId.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Собеседник</p>
            <h2 className="text-sm font-black uppercase italic text-slate-900">ID: {recipientId.slice(0, 8)}</h2>
          </div>
        </div>
      </div>

      {/* СООБЩЕНИЯ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:24px_24px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 opacity-20" /></div>
        ) : messages.map((msg: any) => (
          <div key={msg.id} className={cn("flex flex-col max-w-[75%]", msg.senderId === currentUserId ? "ml-auto items-end" : "items-start")}>
            <div className={cn(
              "px-6 py-4 rounded-[1.8rem] text-sm font-bold italic tracking-tight shadow-sm",
              msg.senderId === currentUserId ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border-2 border-slate-50 text-slate-900 rounded-tl-none"
            )}>
              {msg.text}
            </div>
            <div className="flex items-center gap-2 mt-2 px-2">
               <span className="text-[8px] font-black uppercase text-slate-300">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {msg.senderId === currentUserId && <CheckCheck size={10} className="text-blue-600 opacity-40" />}
            </div>
          </div>
        ))}
      </div>

      {/* ВВОД */}
      <div className="p-8 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex gap-4 items-center bg-slate-50 p-2 rounded-[2.2rem] border-2 border-transparent focus-within:border-blue-600 focus-within:bg-white transition-all shadow-inner">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={mutation.isPending}
            placeholder={mutation.isPending ? "ОТПРАВКА..." : "НАПРИМЕР: КОГДА СМОЖЕТЕ ПРИСТУПИТЬ?"}
            className="flex-1 h-14 px-6 bg-transparent outline-none font-black italic text-[11px] tracking-widest text-slate-900 placeholder:text-slate-200"
          />
          <button 
            type="submit"
            disabled={!input.trim() || mutation.isPending}
            className="w-14 h-14 bg-slate-900 hover:bg-blue-600 text-white rounded-[1.6rem] flex items-center justify-center transition-all active:scale-95 disabled:opacity-20"
          >
            {mutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  )
}
