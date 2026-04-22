"use client"

import * as React from "react"
import Link from "next/link"
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query"
import {
  Send, Loader2, Zap, Check, CheckCheck,
  Clock, ChevronDown, ShieldAlert
} from "lucide-react"

import { getMessages, markMessagesAsRead, sendMessage } from "@/actions/chat/message"
import { getPusherClient } from "@/lib/pusher-client"
import { cn, getChatKey, getMessagesQueryKey } from "@/lib/utils"
import { ChatDialog, InfiniteMessagesResponse, MessagesPage, MessageWithSender, PusherPayload } from "@/lib/types/chat"

// --- ТИПЫ ---
interface ChatWindowProps {
  partner: {
    id: string
    name: string | null
    image: string | null
  }
  order: {
    id: string
    title: string
    clientId: string
    status: string
  } | null
  currentUserId: string
}


const scrollPositions: Record<string, number> = {}
const isStickToBottom: Record<string, boolean> = {}

export function ChatWindow({ partner, order, currentUserId }: ChatWindowProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = React.useState("")
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [showScrollButton, setShowScrollButton] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const chatKey = React.useMemo(() =>
    getChatKey(order?.id, currentUserId, partner.id),
    [order?.id, currentUserId, partner.id]
  );

  const queryKey = React.useMemo(() => getMessagesQueryKey(chatKey), [chatKey]);


  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    container.scrollTo({ top: container.scrollHeight + 10000, behavior })
  }

  // 1. ЗАГРУЗКА ИСТОРИИ
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery<InfiniteMessagesResponse>({
    queryKey,
    queryFn: ({ pageParam }) =>
      getMessages({
        recipientId: partner.id,
        orderId: order?.id,
        cursor: pageParam as string | undefined,
        limit: 30
      }),
    initialPageParam: undefined,
    // Теперь TS знает, что в lastPage есть nextCursor
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!partner.id,
  })

  // 2. messages теперь автоматически получают тип MessageWithSender[]
  const messages = React.useMemo(() => {
    // data?.pages теперь типизирован как InfiniteMessagesResponse[]
    const allMessages = data?.pages.flatMap((page) => page.messages) || []

    // Больше не нужно "as ChatMessage[]", TS и так видит MessageWithSender[]
    return [...allMessages].reverse()
  }, [data?.pages])

  // ЛОГИКА ZWORK: Разрешено ли писать?
  const hasClientStarted = React.useMemo(() => {
    if (!order) return true
    const isMaster = order.clientId !== currentUserId
    if (!isMaster) return true
    return messages.some(m => m.senderId === order.clientId)
  }, [messages, order, currentUserId])


  // 2. PUSHER
  React.useEffect(() => {
    const pusher = getPusherClient()
    const channelName = order
      ? `chat-order-${order.id}`
      : `chat-direct-${[currentUserId, partner.id].sort().join('-')}`

    const channel = pusher.subscribe(channelName)

    // Теперь сюда прилетает payload: PusherPayload
    const handleNewMessage = (payload: PusherPayload) => {
      // 1. Проверяем тип события (TS теперь спокоен благодаря дискриминантному объединению)
      if (payload.type !== "NEW_MESSAGE") return

      const msg = payload.data.message
      if (!msg) return

      // ВНИМАНИЕ: queryClient.setQueryData здесь НЕ НУЖЕН. 
      // Его уже выполнил useNotifications, обновив кэш по ключу ["messages", chatKey]

      // 2. Логика скролла
      // Если сообщение отправили МЫ или мы и так находимся внизу чата ("прилипли")
      if (msg.senderId === currentUserId || isStickToBottom[chatKey]) {
        // Даем 100мс, чтобы React успел отрисовать новые данные, попавшие в кэш, и скроллим
        setTimeout(() => scrollToBottom("auto"), 100)
      } else {
        // Если пишет собеседник, а мы читаем историю где-то наверху:
        // Показываем кнопку "Вниз" и увеличиваем счетчик новых сообщений на ней
        setUnreadCount(prev => prev + 1)
        setShowScrollButton(true)
      }
    }


    // Это событие остается без изменений (оно простое)
    const handleRead = ({ readerId }: { readerId: string }) => {
      if (readerId !== currentUserId) {
        queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              messages: page.messages.map(m =>
                m.senderId === currentUserId ? { ...m, isRead: true } : m
              )
            }))
          }
        })
      }
    }

    channel.bind("new-message", handleNewMessage)
    channel.bind("messages-read", handleRead)

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [partner.id, order?.id, currentUserId, chatKey, queryClient])

  // 3. ВОССТАНОВЛЕНИЕ СКРОЛЛА
  React.useLayoutEffect(() => {
    if (isLoading || messages.length === 0) return
    const timer = setTimeout(() => {
      const savedPos = scrollPositions[chatKey]
      if (isStickToBottom[chatKey] || savedPos === undefined) {
        scrollToBottom("auto")
        isStickToBottom[chatKey] = true
      } else {
        if (scrollRef.current) scrollRef.current.scrollTop = savedPos
      }
      setIsReady(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [chatKey, isLoading, messages.length])

  // 4. ОБРАБОТКА СКРОЛЛА (ЧТЕНИЕ)
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    scrollPositions[chatKey] = scrollTop
    const fromBottom = scrollHeight - scrollTop - clientHeight

    isStickToBottom[chatKey] = fromBottom < 100
    setShowScrollButton(fromBottom > 150)

    if (fromBottom < 50) {
      // 1. Считаем, сколько именно сообщений мы сейчас "прочитаем"
      const unreadInThisChat = messages.filter(m => m.senderId === partner.id && !m.isRead)
      const countToReduce = unreadInThisChat.length

      if (countToReduce > 0) {
        try {
          // 2. Мгновенно "обеляем" бабблы в текущем чате
          queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map(p => ({
                ...p,
                messages: p.messages.map(m =>
                  m.senderId === partner.id ? { ...m, isRead: true } : m
                )
              }))
            }
          })

          // 3. Мгновенно обновляем список диалогов (ChatList) — обнуляем кружок
          queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
            if (!old) return old
            return old.map(d => {
              const isMatch = order?.id
                ? d.lastMessage?.orderId === order.id
                : d.partner.id === partner.id

              return isMatch ? { ...d, unreadCount: 0 } : d
            })
          })

          // 4. Мгновенно вычитаем прочитанное из глобального счетчика (Badge)
          queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => {
            if (!old) return old
            return { count: Math.max(0, old.count - countToReduce) }
          })

          setUnreadCount(0)

          // 5. Просто уведомляем сервер в фоне (без await, если не критично)
          // Но лучше оставить await, чтобы база успела обновиться до того, как юзер уйдет
          await markMessagesAsRead(partner.id, order?.id)

        } catch (error) {
          console.error("Ошибка при чтении:", error)
        }
      }
    }
  }

  // 5. ОТПРАВКА
  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ recipientId: partner.id, text, orderId: order?.id }),

    onMutate: async (newText) => {
      await queryClient.cancelQueries({ queryKey })
      const optimisticMsg: MessageWithSender = {
        id: `temp-${Date.now()}`, // Временный ID
        text: newText,
        senderId: currentUserId,
        recipientId: partner.id,
        orderId: order?.id || null,
        createdAt: new Date(),
        isRead: false,
        isOptimistic: true, // Флаг для стилей (серое/прозрачное)
        sender: { id: currentUserId, name: "Вы", image: null }
      }
      console.log("MUTATION", { chatKey })
      queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((p, i) => i === 0 ? { ...p, messages: [optimisticMsg, ...p.messages] } : p)
        }
      })
      setInput("")
      scrollToBottom("auto")
    },
    onSuccess: (response) => {
      if (!response.data) return
      console.log(queryKey, 'mutation')
      queryClient.setQueryData<InfiniteData<MessagesPage>>(queryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page, i) => i === 0 ? {
            ...page,
            messages: page.messages.map(m =>
              // Заменяем свой временный баббл на реальный из ответа сервера
              (m.isOptimistic && m.text === response.data.text) ? response.data : m
            )
          } : page)
        }
      })
    }


  })

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* HEADER */}
      <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20 shadow-sm">
        <Link href={`/profile/${partner.id}`} className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black italic shadow-lg group-hover:bg-blue-600 transition-all shrink-0 overflow-hidden">
            {partner.image ? <img src={partner.image} className="w-full h-full object-cover" /> : partner.name?.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 leading-none italic">Профиль</p>
            <h2 className="text-lg font-black uppercase italic text-slate-900 leading-none truncate max-w-[200px]">{partner.name}</h2>
          </div>
        </Link>
        {order && (
          <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
            <Zap size={14} className="text-blue-600 fill-blue-600" />
            <span className="text-[9px] font-black uppercase text-blue-600 italic leading-none truncate max-w-[150px]">Заказ: {order.title}</span>
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-slate-50/20 overflow-hidden flex flex-col">
        {(!isReady || isLoading) && (
          <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600 opacity-20 w-10 h-10" />
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn("absolute inset-0 overflow-y-auto p-6 md:p-10 chat-scrollbar", isReady ? "opacity-100" : "opacity-0")}
          style={{ scrollBehavior: 'auto' }}
        >
          {hasNextPage && <button onClick={() => fetchNextPage()} className="w-full py-4 text-[8px] font-black uppercase text-slate-300 hover:text-blue-600 italic">Загрузить историю</button>}

          <div className="flex flex-col gap-6 messages-wrapper pb-10">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={cn("flex flex-col max-w-[85%] md:max-w-[75%] shrink-0", isMe ? "ml-auto items-end" : "items-start")}>
                  <div className={cn(
                    "px-5 py-3.5 rounded-[2rem] text-sm font-bold italic tracking-tight shadow-sm w-fit break-words transition-all duration-500",
                    isMe
                      ? msg.isOptimistic ? "bg-blue-400 text-white/80 scale-[0.98]" : "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-50"
                      : cn(
                        "rounded-tl-none shadow-sm border-2",
                        (!msg.isRead && msg.senderId === partner.id)
                          ? "bg-slate-100 border-blue-100 text-slate-600 italic"
                          : "bg-white border-slate-50 text-slate-900"
                      )
                  )}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 mt-2 px-3 opacity-40">
                    <span className="text-[8px] font-black uppercase italic tracking-tighter">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <div className="flex items-center">
                        {msg.isOptimistic ? <Clock size={10} className="animate-pulse" /> : msg.isRead ? <CheckCheck size={11} className="text-blue-600" /> : <Check size={11} className="text-slate-400" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showScrollButton && (
          <button onClick={() => scrollToBottom("smooth")} className="absolute bottom-6 right-8 w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl flex items-center justify-center text-slate-900 z-30 transition-all active:scale-90 animate-in zoom-in">
            <ChevronDown size={24} />
            {unreadCount > 0 && <div className="absolute -top-3 -left-3 bg-blue-600 text-white min-w-[24px] h-6 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white animate-bounce">{unreadCount}</div>}
          </button>
        )}
      </div>

      <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
        {!hasClientStarted ? (
          <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] flex items-center gap-4">
            <ShieldAlert className="text-amber-600 shrink-0" size={24} />
            <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest italic">Мастер может ответить только после первого сообщения от заказчика.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); if (input.trim() && !mutation.isPending) mutation.mutate(input) }}
            className="flex gap-4 items-center bg-slate-50 p-2 rounded-[2.5rem] border-2 border-transparent focus-within:border-blue-600 focus-within:bg-white shadow-inner transition-all"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={mutation.isPending}
              placeholder="НАПИШИТЕ СООБЩЕНИЕ..."
              className="flex-1 h-14 px-8 bg-transparent outline-none font-black italic text-[11px] tracking-widest text-slate-900 placeholder:text-slate-300 uppercase"
            />
            <button type="submit" disabled={!input.trim() || mutation.isPending} className="w-14 h-14 bg-slate-900 hover:bg-blue-600 text-white rounded-[1.8rem] flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xl">
              {mutation.isPending ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} className="ml-1" />}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
