
"use client"

import * as React from "react"
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query"
import { Send, Loader2, CheckCheck, ChevronDown, Zap, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import Pusher from "pusher-js"
import { getMessages, sendMessage, type MessageWithSender, type InfiniteMessagesResponse, markMessagesAsRead } from "@/actions/chat/message"
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
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  // Рефы для фиксации скролла
  const lastScrollHeightRef = React.useRef<number>(0)
  const isFirstLoadRef = React.useRef<boolean>(true)

  const [showScrollButton, setShowScrollButton] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)

  const queryKey = ["messages", orderId ? `order-${orderId}` : `user-${recipientId}`]

  // 1. ЗАГРУЗКА ДАННЫХ
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<InfiniteMessagesResponse, Error, InfiniteData<InfiniteMessagesResponse>>({
    queryKey,
    queryFn: ({ pageParam }) => getMessages({
      recipientId, orderId, cursor: pageParam as string | undefined,
      limit: 15
    }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!recipientId,

  })

  const messages = React.useMemo(() => {
    const allMessages = data?.pages.flatMap((page) => page.messages) || []
    return [...allMessages].reverse() as ChatMessage[]
  }, [data?.pages])

  // 2. ИДЕАЛЬНОЕ ЯКОРЕНИЕ (useLayoutEffect срабатывает до отрисовки)
  React.useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return

    if (isFetchingNextPage) {
      lastScrollHeightRef.current = container.scrollHeight
    } else if (lastScrollHeightRef.current > 0) {
      // Используем Math.round для предотвращения субпиксельных прыжков
      const heightDiff = Math.round(container.scrollHeight - lastScrollHeightRef.current)
      container.scrollTop += heightDiff
      lastScrollHeightRef.current = 0
    }
  }, [messages.length, isFetchingNextPage])

  // 3. АВТОСКРОЛЛ ВНИЗ
  React.useEffect(() => {
    const container = scrollRef.current
    if (!container || isFetchingNextPage) return

    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return

    const isMyMessage = lastMsg.senderId === currentUserId
    const isAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 300

    if (isFirstLoadRef.current) {
      container.scrollTop = container.scrollHeight
      isFirstLoadRef.current = false
    } else if (isMyMessage || isAtBottom) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      setUnreadCount(0)
    }
  }, [messages[messages.length - 1]?.id, currentUserId])

  // 4. МУТАЦИЯ ОТПРАВКИ
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
        return { ...old, pages: old.pages.map((p, i) => i === 0 ? { ...p, messages: [optimisticMsg, ...p.messages] } : p) }
      })
      return { previousMessages }
    },
    onSuccess: () => {
      setInput("")
      queryClient.invalidateQueries({ queryKey: ["dialogs"] })
    },
    onSettled: () => setTimeout(() => queryClient.invalidateQueries({ queryKey }), 1000)
  })

  // 5. PUSHER
  React.useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! })
    const channelName = orderId ? `chat-order-${orderId}` : `chat-user-${[currentUserId, recipientId].sort().join('-')}`
    const channel = pusher.subscribe(channelName)

    channel.bind("new-message", (newMessage: MessageWithSender) => {
      const container = scrollRef.current
      const isAtBottom = container
        ? (container.scrollHeight - container.scrollTop - container.clientHeight) < 150
        : false

      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old

        // 1. Проверяем, нет ли уже этого сообщения по ID (защита от дублей)
        const allMessages = old.pages.flatMap(p => p.messages)
        if (allMessages.some(m => m.id === newMessage.id)) return old

        // 2. Обновляем страницы
        return {
          ...old,
          pages: old.pages.map((page, index) => {
            if (index === 0) {
              // Вот эта логика:
              const filteredMessages = page.messages.filter((m) => {
                const isTemp = (m as ChatMessage).isOptimistic;
                const isSameText = m.text === newMessage.text;
                return !(isTemp && isSameText);
              });

              return {
                ...page,
                messages: [newMessage, ...filteredMessages]
              };
            }
            return page;
          })
        };
      })

      if (newMessage.senderId !== currentUserId && !isAtBottom) setUnreadCount(prev => prev + 1)

      queryClient.invalidateQueries({ queryKey: ["dialogs"] });
    })
    //messages-read
    channel.bind("messages-read", ({ readerId }: { readerId: string }) => {
      // Если прочитал собеседник, а не я
      if (readerId !== currentUserId) {
        queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              // Помечаем все МОИ сообщения как прочитанные
              messages: page.messages.map(m =>
                m.senderId === currentUserId ? { ...m, isRead: true } : m
              )
            }))
          };
        });
      }
    });

    return () => { pusher.unsubscribe(channelName); pusher.disconnect() }
  }, [orderId, recipientId, currentUserId])

  // 6. OBSERVER & SCROLL HANDLER
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    setShowScrollButton((scrollHeight - scrollTop - clientHeight) > 400)
    if ((scrollHeight - scrollTop - clientHeight) < 50) setUnreadCount(0)
  }

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFirstLoadRef.current) fetchNextPage()
    }, { threshold: 0 })
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  React.useEffect(() => {
    if (messages.length > 0) {
      // Если последнее сообщение в списке — от собеседника и оно не прочитано
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== currentUserId && !lastMsg.isRead) {
        markMessagesAsRead(recipientId, orderId);
        queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      }
    }
  }, [messages.length, recipientId, currentUserId]);

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* HEADER */}
      <div className="px-10 py-6 border-b border-slate-100 shrink-0 bg-white z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black italic shadow-lg">
            {recipientId.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Собеседник</p>
            <h2 className="text-lg font-black uppercase italic text-slate-900 leading-none">ID: {recipientId.slice(0, 8)}</h2>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 relative bg-slate-50/30 overflow-hidden ">
        <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto p-6 md:p-10 space-y-6 chat-scrollbar">

          {/* СТАТИЧНЫЙ ЛОАДЕР */}
          <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center anchor-none shrink-0">
            {isFetchingNextPage ? <Loader2 className="animate-spin text-blue-600/40 w-5 h-5" /> : <div className="h-5" />}
          </div>

          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 opacity-20 w-10 h-10" /></div>
          ) : messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%] md:max-w-[75%] ",
                msg.senderId === currentUserId ? "ml-auto items-end" : "items-start",

              )}
            >
              <div className={cn(
                "px-5 py-3.5 rounded-[2rem] text-sm font-bold italic tracking-tight shadow-sm w-fit  break-words",
                msg.isOptimistic ? "opacity-50" : "opacity-100",
                msg.senderId === currentUserId
                  ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-50"
                  : "bg-white border-2 border-slate-50 text-slate-900 rounded-tl-none"
              )}>
                {msg.text}
              </div>
              <div className="flex items-center gap-2 mt-2 px-3 opacity-40">
                <span className="text-[8px] font-black uppercase text-slate-400">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.senderId === currentUserId &&
                  (
                    <div className="flex items-center ml-1">
                      {msg.isRead ? (
                        // ДВЕ ГАЛОЧКИ: Прочитано (синие или голубые)
                        <CheckCheck size={12} className="text-blue-400" />
                      ) : (
                        // ОДНА ГАЛОЧКА: Доставлено (серые)
                        <Check size={12} className="text-slate-300" />
                      )}
                    </div>
                  )
                }
              </div>
            </div>
          ))}
        </div>

        {/* BUTTON DOWN */}
        {(showScrollButton || unreadCount > 0) && (
          <button
            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
            className="absolute bottom-6 right-8 w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl flex items-center justify-center text-slate-900 hover:text-blue-600 z-30 transition-all active:scale-90 group animate-in zoom-in"
          >
            <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
            {unreadCount > 0 && <div className="absolute -top-3 -left-3 bg-blue-600 text-white min-w-[24px] h-6 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white animate-bounce">{unreadCount}</div>}
          </button>
        )}
      </div>

      {/* INPUT */}
      <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && !mutation.isPending) mutation.mutate(input) }} className="flex gap-4 items-center bg-slate-50 p-2 rounded-[2.5rem] border-2 border-transparent focus-within:border-blue-600 focus-within:bg-white transition-all shadow-inner">
          <input value={input} onChange={(e) => setInput(e.target.value)} disabled={mutation.isPending} placeholder="НАПИШИТЕ СООБЩЕНИЕ..." className="flex-1 h-14 px-8 bg-transparent outline-none font-black italic text-[11px] tracking-widest text-slate-900 placeholder:text-slate-300" />
          <button type="submit" disabled={!input.trim() || mutation.isPending} className="w-14 h-14 bg-slate-900 hover:bg-blue-600 text-white rounded-[1.8rem] flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xl">
            {mutation.isPending ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} className="ml-1" />}
          </button>
        </form>
      </div>
    </div>
  )
}
