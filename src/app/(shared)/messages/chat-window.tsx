"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Send, Loader2, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import Pusher from "pusher-js"
import { getOrderMessages, sendMessage } from "@/actions/chat/message"
import { toast } from "sonner"

export function ChatWindow({ recipientId, orderId, currentUserId }: any) {
  const queryClient = useQueryClient()
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const queryKey = ["messages", orderId || recipientId]

  // 1. ПОЛУЧЕНИЕ СООБЩЕНИЙ
  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getOrderMessages(orderId || ""),
    enabled: !!recipientId,
  })

  // 2. МУТАЦИЯ С УМНЫМ OPTIMISTIC UPDATE
  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ recipientId, text, orderId }),
    onMutate: async (newText) => {
      await queryClient.cancelQueries({ queryKey })
      const previousMessages = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: any) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`, // Уникальный временный ID
          text: newText,
          senderId: currentUserId,
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        },
      ])
      return { previousMessages }
    },
    onError: (err, newText, context) => {
      queryClient.setQueryData(queryKey, context?.previousMessages)
      toast.error("Не удалось отправить")
    },
    onSuccess: () => {
      setInput("")
      // Не делаем invalidate здесь, чтобы избежать лишнего прыжка, Pusher сделает всё сам
      queryClient.invalidateQueries({ queryKey: ["dialogs"] })
    },
    onSettled: () => {
        // Синхронизируем базу через секунду, когда анимация уже прошла
        setTimeout(() => queryClient.invalidateQueries({ queryKey }), 1000)
    }
  })

  // 3. PUSHER С ФИЛЬТРАЦИЕЙ ДУБЛЕЙ
  React.useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channelName = orderId ? `chat-order-${orderId}` : `chat-user-${[currentUserId, recipientId].sort().join('-')}`
    const channel = pusher.subscribe(channelName)

    channel.bind("new-message", (newMessage: any) => {
      queryClient.setQueryData(queryKey, (old: any) => {
        // Если такое сообщение (по ID) уже есть — ничего не делаем
        if (old?.find((m: any) => m.id === newMessage.id)) return old

        // Умная замена: убираем оптимистичное сообщение с таким же текстом
        const filtered = old?.filter((m: any) => 
            !(m.isOptimistic && m.text === newMessage.text)
        ) || []

        return [...filtered, newMessage]
      })
      queryClient.invalidateQueries({ queryKey: ["dialogs"] })
    })

    return () => { pusher.unsubscribe(channelName); pusher.disconnect() }
  }, [orderId, recipientId, currentUserId, queryClient, queryKey])

  // Авто-скролл
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || mutation.isPending) return
    mutation.mutate(input)
  }

  return (
     <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* ХЕДЕР */}
      <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black italic shadow-lg">
            {recipientId.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1 text-left">Собеседник</p>
            <h2 className="text-sm font-black uppercase italic text-slate-900 leading-none">ID: {recipientId.slice(0, 8)}</h2>
          </div>
        </div>
      </div>

      {/* СООБЩЕНИЯ */}
      <div className="flex-1 relative bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:24px_24px]">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto p-6 md:p-10 space-y-6 chat-scrollbar"
        >
          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 opacity-20" /></div>
          ) : messages.map((msg: any) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%] md:max-w-[75%]",
                msg.senderId === currentUserId ? "ml-auto items-end" : "items-start",
                msg.isOptimistic && "opacity-50 scale-[0.98]" // Мягкий визуальный эффект отправки
              )}
            >
              <div className={cn(
                "px-5 py-3.5 rounded-[1.8rem] text-sm font-bold italic tracking-tight shadow-sm leading-tight",
                msg.senderId === currentUserId ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border-2 border-slate-50 text-slate-900 rounded-tl-none"
              )}>
                {msg.text}
              </div>

              <div className="flex items-center gap-2 mt-2 px-2">
                {msg.isOptimistic ? (
                  <div className="flex items-center gap-1.5 animate-pulse">
                    <Loader2 size={10} className="animate-spin text-blue-600" />
                    <span className="text-[8px] font-black uppercase text-blue-600 italic">Отправка</span>
                  </div>
                ) : (
                  <>
                    <span className="text-[8px] font-black uppercase text-slate-300 leading-none">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.senderId === currentUserId && <CheckCheck size={10} className="text-blue-600 opacity-40" />}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ВВОД */}
      <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={handleSend} className="flex gap-4 items-center bg-slate-50 p-2 rounded-[2.2rem] border-2 border-transparent focus-within:border-blue-600 focus-within:bg-white transition-all shadow-inner">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={mutation.isPending}
            placeholder="НАПИШИТЕ СООБЩЕНИЕ..."
            className="flex-1 h-12 md:h-14 px-6 bg-transparent outline-none font-black italic text-[11px] tracking-widest text-slate-900 placeholder:text-slate-200"
          />
          <button
            type="submit"
            disabled={!input.trim() || mutation.isPending}
            className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 hover:bg-blue-600 text-white rounded-[1.4rem] flex items-center justify-center transition-all shrink-0 active:scale-90"
          >
            {mutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  )
}
