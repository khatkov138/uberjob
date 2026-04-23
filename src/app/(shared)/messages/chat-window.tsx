"use client"

import * as React from "react"
import { useInfiniteQuery, useQueryClient, InfiniteData } from "@tanstack/react-query"
import { Loader2, Send, Zap, ShieldAlert, ChevronDown, Check, CheckCheck, Clock } from "lucide-react"
import Link from "next/link"
import { cn, getMessagesQueryKey, getContextKey } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { getMessages, markMessagesAsRead, sendMessage } from "@/actions/chat/message"
import { MessageWithSender, InfiniteMessagesResponse, ChatDialog } from "@/lib/types/chat"

interface ChatWindowProps {
  partner: { id: string; name: string | null; image: string | null }
  order: { id: string; title: string; clientId: string; status: string } | null
  currentUserId: string
}

// Глобальные стейты для сохранения позиции при переходах между чатами
const scrollPositions: Record<string, number> = {}
const isStickToBottom: Record<string, boolean> = {}

export function ChatWindow({ partner, order, currentUserId }: ChatWindowProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = React.useState("")
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [showScrollButton, setShowScrollButton] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // 1. КОНТЕКСТНЫЙ КЛЮЧ (Тот же, что использует Server и useNotifications)
  const contextKey = React.useMemo(() =>
    getContextKey(order?.id, currentUserId, partner.id),
    [order?.id, currentUserId, partner.id]
  )
  const queryKey = getMessagesQueryKey(contextKey)

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    container.scrollTo({ top: container.scrollHeight + 10000, behavior })
  }

  // 2. ЗАГРУЗКА ИСТОРИИ (TanStack Query)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<InfiniteMessagesResponse>({
    queryKey,
    queryFn: ({ pageParam }) => getMessages({
      recipientId: partner.id,
      orderId: order?.id,
      cursor: pageParam as string | undefined,
      limit: 30
    }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!partner.id,
  })

  const messages = React.useMemo(() => {
    const allMessages = data?.pages.flatMap((page) => page.messages) || []
    return [...allMessages].reverse()
  }, [data?.pages])

  // 3. АВТО-СКРОЛЛ ПРИ ПОЛУЧЕНИИ НОВЫХ ДАННЫХ
  // Мы просто следим за ID последнего сообщения. Если оно изменилось — реагируем.
  const lastMessageId = messages[messages.length - 1]?.id
  React.useEffect(() => {
    if (!lastMessageId || !isReady) return

    const lastMsg = messages[messages.length - 1]
    const isMe = lastMsg.senderId === currentUserId

    if (isMe || isStickToBottom[contextKey]) {
      // Используем requestAnimationFrame, чтобы дождаться отрисовки нового баббла
      requestAnimationFrame(() => scrollToBottom("smooth"))
      setUnreadCount(0)
    } else {
      setUnreadCount(prev => prev + 1)
      setShowScrollButton(true)
    }
  }, [lastMessageId, isReady])

  // 4. ОТПРАВКА СООБЩЕНИЯ (Optimistic Update)
  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ recipientId: partner.id, text, orderId: order?.id }),
    onMutate: async (newText) => {
      // Отменяем исходящие запросы, чтобы они не перезаписали наш оптимистичный апдейт
      await queryClient.cancelQueries({ queryKey })
      await queryClient.cancelQueries({ queryKey: ["dialogs"] })

      const optimisticMsg: MessageWithSender = {
        id: `temp-${Date.now()}`,
        text: newText,
        senderId: currentUserId,
        recipientId: partner.id,
        orderId: order?.id || null,
        createdAt: new Date(),
        isRead: false,
        isOptimistic: true,
        sender: { id: currentUserId, name: "Вы", image: null }
      }

      // 1. Обновляем сообщения в окне (ЛОКАЛЬНО)
      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((p, i) => i === 0 ? { ...p, messages: [optimisticMsg, ...p.messages] } : p)
        }
      })

      // 2. Обновляем список диалогов (ЛОКАЛЬНО)
      queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
        if (!old) return old
        const dialogs = [...old]
        const index = dialogs.findIndex(d =>
          order?.id ? d.lastMessage?.orderId === order.id : d.partner.id === partner.id
        )
        if (index !== -1) {
          const [updated] = dialogs.splice(index, 1)
          return [{ ...updated, lastMessage: optimisticMsg }, ...dialogs]
        }
        return dialogs
      })

      setInput("")
      requestAnimationFrame(() => scrollToBottom("auto"))
    },
    onSuccess: (response) => {
      if (!response.data) return
      const realMsg = response.data

      // ЗАМЕНЯЕМ temp на real БЕЗ ЗАПРОСА К СЕРВЕРУ
      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            messages: page.messages.map(m =>
              // Ищем по временному ID или по тексту (если ID уже заменился)
              (m.isOptimistic && m.text === realMsg.text) ? realMsg : m
            )
          }))
        }
      })

      // Обновляем текст в списке диалогов на финальный (тоже локально)
      queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
        if (!old) return old
        return old.map(d => {
          const isMatch = order?.id ? d.lastMessage?.orderId === order.id : d.partner.id === partner.id
          return isMatch ? { ...d, lastMessage: realMsg } : d
        })
      })
    }
  })

  // 5. ОБРАБОТКА СКРОЛЛА И ЧТЕНИЯ
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const fromBottom = scrollHeight - scrollTop - clientHeight;

    if (fromBottom < 50) {
      // Находим сообщения собеседника, которые мы еще не "прочитали" в UI
      const unreadMessages = messages.filter(m => m.senderId === partner.id && !m.isRead);

      if (unreadMessages.length > 0) {

        // 1. МГНОВЕННО КРАСИМ В БЕЛЫЙ (Обновляем кэш сообщений)
        queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              messages: page.messages.map(m =>
                m.senderId === partner.id ? { ...m, isRead: true } : m
              )
            }))
          };
        });

        // 2. МГНОВЕННО УБИРАЕМ ТОЧКУ В СПИСКЕ (ChatList)
        queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {

          if (!old) return old;
          return old.map(d => {
            const isMatch = order?.id
              ? d.lastMessage?.orderId === order.id
              : d.partner.id === partner.id;
            return isMatch ? { ...d, unreadCount: 0 } : d;
          });
        });

        // 3. МГНОВЕННО УМЕНЬШАЕМ СЧЕТЧИК В НАВБАРЕ
        const countToReduce = unreadMessages.length;
        queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => ({
          count: Math.max(0, (old?.count || 0) - countToReduce)
        }));

        // 4. ШЛЕМ НА СЕРВЕР (чтобы он уведомил собеседника и обновил БД)
        markMessagesAsRead(partner.id, order?.id);
      }
    }
  };

  // Восстановление позиции при заходе в чат
  React.useLayoutEffect(() => {
    if (isLoading || messages.length === 0) return
    const timer = setTimeout(() => {
      const savedPos = scrollPositions[contextKey]
      if (isStickToBottom[contextKey] || savedPos === undefined) {
        scrollToBottom("auto")
        isStickToBottom[contextKey] = true
      } else {
        if (scrollRef.current) scrollRef.current.scrollTop = savedPos
      }
      setIsReady(true)
    }, 50)
    return () => clearTimeout(timer)
  }, [contextKey, isLoading])

  // Логика ZWORK: Мастер ждет первого сообщения клиента
  const hasClientStarted = React.useMemo(() => {
    if (!order) return true
    if (order.clientId === currentUserId) return true
    return messages.some(m => m.senderId === order.clientId)
  }, [messages, order, currentUserId])

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* HEADER */}
      <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20 shadow-sm">
        <Link href={`/profile/${partner.id}`} className="flex items-center gap-4 group text-left">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black italic shadow-lg group-hover:bg-blue-600 transition-all shrink-0 overflow-hidden">
            {partner.image ? <img src={partner.image} className="w-full h-full object-cover" /> : partner.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 leading-none italic tracking-tighter">Профиль</p>
            <h2 className="text-lg font-black uppercase italic text-slate-900 leading-none truncate max-w-[200px]">{partner.name}</h2>
          </div>
        </Link>
        {order && (
          <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2 max-w-[200px]">
            <Zap size={14} className="text-blue-600 fill-blue-600 shrink-0" />
            <span className="text-[9px] font-black uppercase text-blue-600 italic leading-none truncate tracking-tight">Заказ: {order.title}</span>
          </div>
        )}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 relative bg-slate-50/20 overflow-hidden flex flex-col">
        {(!isReady || isLoading) && (
          <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600 opacity-20 w-10 h-10" />
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn("absolute inset-0 overflow-y-auto p-6 md:p-10 chat-scrollbar transition-opacity duration-300", isReady ? "opacity-100" : "opacity-0")}
        >
          {hasNextPage && (
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="w-full py-4 text-[8px] font-black uppercase text-slate-300 hover:text-blue-600 italic tracking-widest">
              {isFetchingNextPage ? "Загрузка..." : "Загрузить историю"}
            </button>
          )}

          <div className="flex flex-col gap-6 pb-10">
            {messages.map((msg, index) => {
              const isMe = msg.senderId === currentUserId;
              const prevMsg = messages[index - 1];
              const nextMsg = messages[index + 1];

              // Проверяем: это начало блока сообщений от одного автора?
              const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
              // Проверяем: это последнее сообщение в блоке?
              const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

              return (
                <div key={msg.id} className={cn(
                  "flex flex-col max-w-[85%] md:max-w-[75%] shrink-0",
                  isMe ? "ml-auto items-end" : "items-start",
                  isFirstInGroup ? "mt-6" : "mt-1" // Большой отступ только для нового блока
                )}>
                  <div className={cn(
                    "px-5 py-3.5 text-sm font-bold italic tracking-tight shadow-sm w-fit break-words transition-all duration-500",
                    isMe
                      ? cn(
                        "bg-blue-600 text-white shadow-lg shadow-blue-50",
                        "rounded-[2rem]",
                        !isLastInGroup && "rounded-br-lg", // "Сглаживаем" угол, если дальше пишет тот же юзер
                        !isFirstInGroup && "rounded-tr-lg"
                      )
                      : cn(
                        "bg-white border-2 border-slate-50 text-slate-900",
                        "rounded-[2rem]",
                        !isLastInGroup && "rounded-bl-lg",
                        !isFirstInGroup && "rounded-tl-lg",
                        (!msg.isRead && msg.senderId === partner.id) && "bg-slate-100 border-blue-100"
                      )
                  )}>
                    {msg.text}
                  </div>

                  {/* Время и галочки показываем только у ПОСЛЕДНЕГО сообщения в группе */}
                  {isLastInGroup && (
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
                  )}
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

      {/* INPUT */}
      <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
        {!hasClientStarted ? (
          <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] flex items-center gap-4">
            <ShieldAlert className="text-amber-600 shrink-0" size={24} />
            <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest italic">Мастер может ответить только после сообщения заказчика.</p>
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
