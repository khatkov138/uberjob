"use client"

import * as React from "react"
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query"
import { Send, Loader2, CheckCheck, Check, ChevronDown, Zap, Clock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getMessages, sendMessage, markMessagesAsRead, type MessageWithSender, type InfiniteMessagesResponse } from "@/actions/chat/message"
import { getPusherClient } from "@/lib/pusher-client"

type ChatMessage = MessageWithSender & { isOptimistic?: boolean }

interface ChatWindowProps {
  recipientId: string
  recipientName: string
  currentUserId: string
  orderId?: string
}

const scrollPositions: Record<string, number> = {}
const isStickToBottom: Record<string, boolean> = {}

export function ChatWindow({ recipientId, recipientName, currentUserId, orderId }: ChatWindowProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = React.useState("")
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [showScrollButton, setShowScrollButton] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const lastScrollHeightRef = React.useRef<number>(0)

  const chatKey = orderId ? `order-${orderId}` : `user-${recipientId}`
  const queryKey = ["messages", chatKey]

  // ФУНКЦИЯ СКРОЛЛА: только auto, чтобы не было дерганий
  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const doScroll = () => {
      container.scrollTo({
        top: container.scrollHeight + 10000,
        behavior: behavior
      });
    };
    doScroll();
    if (behavior === "auto") {
      requestAnimationFrame(doScroll);
    }
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<InfiniteMessagesResponse>({
    queryKey,
    queryFn: ({ pageParam }) => getMessages({ recipientId, orderId, cursor: pageParam as string | undefined, limit: 30 }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!recipientId,
  })

  const messages = React.useMemo(() => {
    const allMessages = data?.pages.flatMap((page) => page.messages) || []
    return [...allMessages].reverse() as ChatMessage[]
  }, [data?.pages])

  // 1. PUSHER
  React.useEffect(() => {
    const pusher = getPusherClient()
    const channelName = orderId ? `chat-order-${orderId}` : `chat-user-${[currentUserId, recipientId].sort().join('-')}`
    const channel = pusher.subscribe(channelName)

    const handleNewMessage = (newMessage: MessageWithSender) => {
      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old
        if (old.pages.flatMap(p => p.messages).some(m => m.id === newMessage.id)) return old

        return {
          ...old,
          pages: old.pages.map((page, index) => {
            if (index === 0) {
              const currentMessages = page.messages;
              const cleanMessages = currentMessages.filter((m) => {
                const isOptimistic = (m as ChatMessage).isOptimistic;
                const isSameText = m.text.trim() === newMessage.text.trim();
                return !(isOptimistic && isSameText);
              });
              return { ...page, messages: [newMessage, ...cleanMessages] };
            }
            return page;
          })
        }
      })

      const stick = isStickToBottom[chatKey]
      if (newMessage.senderId === currentUserId || stick) {
        // Никакого "smooth", только жесткий "auto" чтобы не дергалось
        scrollToBottom("auto")
      } else {
        setUnreadCount(prev => prev + 1)
        setShowScrollButton(true)
      }
      queryClient.invalidateQueries({ queryKey: ["dialogs"] })
    }

    const handleRead = ({ readerId }: { readerId: string }) => {
      if (readerId !== currentUserId) {
        queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              messages: page.messages.map(m => m.senderId === currentUserId ? { ...m, isRead: true } : m)
            }))
          }
        })
      }
    }

    channel.bind("new-message", handleNewMessage)
    channel.bind("messages-read", handleRead)

    return () => { channel.unbind_all(); pusher.unsubscribe(channelName); }
  }, [recipientId, orderId, currentUserId])

  // 2. ВОССТАНОВЛЕНИЕ ПОЗИЦИИ
  React.useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container || isLoading || messages.length === 0) return

    const serverUnreadCount = (data?.pages[0] as any)?.totalUnread || 0

    const timer = setTimeout(() => {
      const savedPos = scrollPositions[chatKey]
      const stick = isStickToBottom[chatKey]

      if (stick || savedPos === undefined) {
        scrollToBottom("auto")
        isStickToBottom[chatKey] = true
        setUnreadCount(0)
        setShowScrollButton(false)
      } else {
        container.scrollTop = savedPos
        const fromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        if (fromBottom > 35) {
          setShowScrollButton(true)
          setUnreadCount(serverUnreadCount)
        }
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [chatKey, isLoading, messages.length, data?.pages])

  // 3. ОБРАБОТКА СКРОЛЛА
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    scrollPositions[chatKey] = scrollTop
    const fromBottom = scrollHeight - scrollTop - clientHeight

    isStickToBottom[chatKey] = fromBottom < 100
    setShowScrollButton(fromBottom > 35)
    console.log(fromBottom)
    if (fromBottom < 15) {
      const hasUnread = messages.some(m => String(m.senderId) === String(recipientId) && !m.isRead)
      console.log(hasUnread)
      if (hasUnread) {
        markMessagesAsRead(recipientId, orderId)
        queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
          if (!old) return old
          return { ...old, pages: old.pages.map(p => ({ ...p, messages: p.messages.map(m => String(m.senderId) === String(recipientId) ? { ...m, isRead: true } : m) })) }
        })
        setUnreadCount(0)
        queryClient.invalidateQueries({ queryKey: ["dialogs"] })
        queryClient.invalidateQueries({ queryKey: ["unread-count"] })
      }
    }
  }

  // 4. МУТАЦИЯ ОТПРАВКИ
  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ recipientId, text, orderId }),
    onMutate: async (newText) => {
      await queryClient.cancelQueries({ queryKey })
      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`, text: newText, senderId: currentUserId, recipientId,
        orderId: orderId || null, createdAt: new Date(), isRead: false, isOptimistic: true,
        sender: { id: currentUserId, name: "Вы" }
      }
      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old
        return { ...old, pages: old.pages.map((p, i) => i === 0 ? { ...p, messages: [optimisticMsg, ...p.messages] } : p) }
      })
      setInput("")
      isStickToBottom[chatKey] = true
      scrollToBottom("auto")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialogs"] })
      // Только здесь можно оставить smooth если очень хочется, но auto надежнее
      scrollToBottom("auto")
    },
    onSettled: () => setTimeout(() => queryClient.invalidateQueries({ queryKey }), 1000)
  })

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20 shadow-sm">
        <Link href={`/profile/${recipientId}`} className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black italic shadow-lg group-hover:bg-blue-600 transition-all shrink-0">
            {recipientName?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Профиль</p>
            <h2 className="text-lg font-black uppercase italic text-slate-900 leading-none truncate max-w-[200px]">{recipientName}</h2>
          </div>
        </Link>
        {orderId && (
          <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
            <Zap size={14} className="text-blue-600 fill-blue-600" />
            <span className="text-[9px] font-black uppercase text-blue-600 italic">Заказ: #{orderId.slice(-6)}</span>
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-slate-50/20 overflow-hidden flex flex-col">
        <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto p-6 md:p-10 chat-scrollbar" style={{ scrollBehavior: 'auto' }}>
          <div className="flex-1 min-h-[40px]" />

          <div className="h-10 w-full flex items-center justify-center shrink-0">
            {isFetchingNextPage ? <Loader2 className="animate-spin text-blue-600/40 w-5 h-5" /> : hasNextPage && <div onClick={() => fetchNextPage()} className="cursor-pointer text-[8px] font-black uppercase text-slate-300 hover:text-blue-600">Загрузить историю</div>}
          </div>

          {isLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 opacity-20 w-10 h-10" /></div>
          ) : (
            <div className="flex flex-col gap-6 messages-wrapper pb-10">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col max-w-[85%] md:max-w-[75%] shrink-0", msg.senderId === currentUserId ? "ml-auto items-end" : "items-start")}>
                  <div className={cn(
                    "px-5 py-3.5 rounded-[2rem] text-sm font-bold italic tracking-tight shadow-sm w-fit break-words transition-colors duration-500",
                    msg.senderId === currentUserId
                      ? msg.isOptimistic ? "bg-blue-400 text-white/80 scale-[0.98]" : "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-50"
                      : (msg.senderId === recipientId && !msg.isRead) ? "bg-blue-50 border-2 border-blue-100 text-slate-900 rounded-tl-none shadow-sm" : "bg-white border-2 border-slate-50 text-slate-900 rounded-tl-none shadow-sm"
                  )}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 mt-2 px-3 opacity-40">
                    <span className="text-[8px] font-black uppercase tracking-tighter">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.senderId === currentUserId && (
                      <div className="flex items-center">
                        {msg.isOptimistic ? <Clock size={10} className="animate-pulse" /> : msg.isRead ? <CheckCheck size={11} className="text-blue-600" /> : <Check size={11} className="text-slate-400" />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showScrollButton && (
          <button onClick={() => scrollToBottom("smooth")} className="absolute bottom-6 right-8 w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl flex items-center justify-center text-slate-900 hover:text-blue-600 z-30 transition-all active:scale-90 animate-in zoom-in">
            <ChevronDown size={24} />
            {unreadCount > 0 && <div className="absolute -top-3 -left-3 bg-blue-600 text-white min-w-[24px] h-6 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white animate-bounce">{unreadCount}</div>}
          </button>
        )}
      </div>

      <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && !mutation.isPending) mutation.mutate(input) }} className="flex gap-4 items-center bg-slate-50 p-2 rounded-[2.5rem] border-2 border-transparent focus-within:border-blue-600 focus-within:bg-white shadow-inner transition-all">
          <input value={input} onChange={(e) => setInput(e.target.value)} disabled={mutation.isPending} placeholder="НАПИШИТЕ СООБЩЕНИЕ..." className="flex-1 h-14 px-8 bg-transparent outline-none font-black italic text-[11px] tracking-widest text-slate-900 placeholder:text-slate-300" />
          <button type="submit" disabled={!input.trim() || mutation.isPending} className="w-14 h-14 bg-slate-900 hover:bg-blue-600 text-white rounded-[1.8rem] flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xl">
            {mutation.isPending ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} className="ml-1" />}
          </button>
        </form>
      </div>
    </div>
  )
}
