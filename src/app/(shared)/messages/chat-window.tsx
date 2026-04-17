"use client"

import * as React from "react"
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query"
import { Send, Loader2, CheckCheck, ChevronDown, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import Pusher from "pusher-js"
import { getMessages, sendMessage, type MessageWithSender, type InfiniteMessagesResponse } from "@/actions/chat/message"
import { toast } from "sonner"

type ChatMessage = MessageWithSender & { isOptimistic?: boolean }

interface ChatWindowProps {
  recipientId: string
  orderId?: string
  currentUserId: string
}

export function ChatWindow({ recipientId, orderId, currentUserId }: ChatWindowProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Состояния для скролла и уведомлений
  const [showScrollButton, setShowScrollButton] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [prevScrollHeight, setPrevScrollHeight] = React.useState<number | null>(null)

  const queryKey = ["messages", orderId ? `order-${orderId}` : `user-${recipientId}`]

  // 1. ПОЛУЧЕНИЕ СООБЩЕНИЙ (Infinite)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<InfiniteMessagesResponse, Error, InfiniteData<InfiniteMessagesResponse>>({
    queryKey,
    queryFn: ({ pageParam }) => getMessages({
      recipientId,
      orderId,
      cursor: pageParam as string | undefined,
      limit: 20
    }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!recipientId,
  })

  const messages = React.useMemo(() => {
    const allMessages = data?.pages.flatMap((page) => page.messages) || []
    return [...allMessages].reverse() as ChatMessage[]
  }, [data?.pages])

  // 2. МУТАЦИЯ ОТПРАВКИ (Вот то, что потерялось)
  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ recipientId, text, orderId }),
    onMutate: async (newText) => {
      await queryClient.cancelQueries({ queryKey })
      const previousMessages = queryClient.getQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey)

      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old
        const optimisticMsg: ChatMessage = {
          id: `temp-${Date.now()}`,
          text: newText,
          senderId: currentUserId,
          recipientId,
          orderId: orderId || null,
          createdAt: new Date(),
          isRead: false,
          isOptimistic: true,
          sender: { id: currentUserId, name: "Вы" }
        }
        return {
          ...old,
          pages: old.pages.map((page, index) =>
            index === 0 ? { ...page, messages: [optimisticMsg, ...page.messages] } : page
          )
        }
      })
      return { previousMessages }
    },
    onSuccess: () => {
      setInput("")
      queryClient.invalidateQueries({ queryKey: ["dialogs"] })
      // После своей отправки всегда скроллим вниз
      setTimeout(() => scrollToBottom("smooth"), 100)
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(queryKey, context?.previousMessages)
      toast.error("Не удалось отправить сообщение")
    },
    onSettled: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey }), 1000)
    }
  })

  // Вспомогательная функция скролла
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
      setUnreadCount(0)
    }
  }

  // СЛЕЖКА ЗА СКРОЛЛОМ (для кнопки и подгрузки)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    setShowScrollButton(distanceFromBottom > 400)
    if (distanceFromBottom < 50) setUnreadCount(0)

    // Подгрузка истории при скролле вверх
    if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  // 3. PUSHER (Real-time)
  React.useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channelName = orderId ? `chat-order-${orderId}` : `chat-user-${[currentUserId, recipientId].sort().join('-')}`
    const channel = pusher.subscribe(channelName)

    channel.bind("new-message", (newMessage: MessageWithSender) => {
      const isAtBottom = scrollRef.current
        ? (scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight) < 150
        : false

      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old
        if (old.pages.flatMap(p => p.messages).some(m => m.id === newMessage.id)) return old
        return {
          ...old,
          pages: old.pages.map((page, index) => index === 0 ? {
            ...page,
            messages: [newMessage, ...page.messages]
          } : page)
        }
      })

      // Логика Telegram: скроллим вниз только если мы и так внизу или это наше сообщение
      if (newMessage.senderId === currentUserId || isAtBottom) {
        setTimeout(() => scrollToBottom("smooth"), 100)
      } else {
        setUnreadCount(prev => prev + 1)
      }
    })

    return () => { pusher.unsubscribe(channelName); pusher.disconnect() }
  }, [orderId, recipientId, currentUserId, queryKey])

  // ЯКОРЕНИЕ СКРОЛЛА
  React.useLayoutEffect(() => {
    if (isFetchingNextPage && scrollRef.current) setPrevScrollHeight(scrollRef.current.scrollHeight)
  }, [isFetchingNextPage])

  React.useLayoutEffect(() => {
    if (prevScrollHeight && scrollRef.current && !isFetchingNextPage) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight
      setPrevScrollHeight(null)
    }
  }, [messages.length, isFetchingNextPage, prevScrollHeight])

  // Первый вход
  React.useEffect(() => {
    if (messages.length > 0 && !hasNextPage && !isFetchingNextPage) scrollToBottom("auto")
  }, [isLoading])

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* HEADER */}
      <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20">
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black italic shadow-lg">
            {recipientId.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Собеседник</p>
            <h2 className="text-lg font-black uppercase italic text-slate-900 leading-none">ID: {recipientId.slice(0, 8)}</h2>
          </div>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 relative bg-slate-50/30">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto p-6 md:p-10 space-y-6 chat-scrollbar scroll-smooth"
        >
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-blue-600 w-6 h-6 opacity-40" />
            </div>
          )}

          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 opacity-20" /></div>
          ) : messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col max-w-[85%] md:max-w-[75%]", msg.senderId === currentUserId ? "ml-auto items-end" : "items-start", msg.isOptimistic && "opacity-50 scale-[0.98]")}>
              <div className={cn("px-6 py-4 rounded-[2rem] text-sm font-bold italic tracking-tight shadow-sm transition-all leading-tight", msg.senderId === currentUserId ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border-2 border-slate-50 text-slate-900 rounded-tl-none")}>
                {msg.text}
              </div>
              <div className="flex items-center gap-2 mt-2 px-3">
                <span className="text-[8px] font-black uppercase text-slate-300">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.senderId === currentUserId && <CheckCheck size={10} className={cn("text-blue-600", msg.isOptimistic ? "opacity-20" : "opacity-40")} />}
              </div>
            </div>
          ))}
        </div>

        {/* КНОПКА "ВНИЗ" */}
        {(showScrollButton || unreadCount > 0) && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-6 right-8 w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl flex items-center justify-center text-slate-900 hover:text-blue-600 transition-all hover:-translate-y-1 active:scale-90 z-30 group animate-in zoom-in duration-200"
          >
            <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
            {unreadCount > 0 && (
              <div className="absolute -top-3 -left-3 bg-blue-600 text-white min-w-[24px] h-6 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                {unreadCount}
              </div>
            )}
          </button>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); if (input.trim() && !mutation.isPending) mutation.mutate(input) }}
          className="flex gap-4 items-center bg-slate-50 p-2 rounded-[2.5rem] border-2 border-transparent focus-within:border-blue-600 focus-within:bg-white transition-all shadow-inner"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={mutation.isPending}
            placeholder="НАПИШИТЕ СООБЩЕНИЕ..."
            className="flex-1 h-14 px-8 bg-transparent outline-none font-black italic text-[11px] tracking-widest text-slate-900 placeholder:text-slate-300 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || mutation.isPending}
            className="w-14 h-14 bg-slate-900 hover:bg-blue-600 text-white rounded-[1.8rem] flex items-center justify-center transition-all shrink-0 shadow-xl active:scale-95 disabled:opacity-20"
          >
            {mutation.isPending ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} className="ml-1" />}
          </button>
        </form>
      </div>
    </div>
  )
}
