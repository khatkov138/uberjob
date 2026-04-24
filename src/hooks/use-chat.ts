"use client"

import { useState, useRef, useMemo, useEffect, useLayoutEffect } from "react"
import { useInfiniteQuery, useQueryClient, useMutation, useQuery, InfiniteData } from "@tanstack/react-query"
import { getMessages, markMessagesAsRead, sendMessage, sendTypingStatus } from "@/actions/chat/message"
import { getContextKey, getMessagesQueryKey } from "@/lib/utils"
import { ChatDialog, InfiniteMessagesResponse, MessageWithSender } from "@/lib/types/chat"

// ГЛОБАЛЬНЫЕ ХРАНИЛИЩА ПОЗИЦИЙ (оставляем, так как это UI-состояние, а не данные БД)
const scrollPositions: Record<string, number> = {};
const isStickToBottomMap: Record<string, boolean> = {};

export function useChat(partnerId: string, orderId: string | undefined, currentUserId: string) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  const contextKey = useMemo(() => getContextKey(orderId, currentUserId, partnerId), [orderId, currentUserId, partnerId])
  const queryKey = getMessagesQueryKey(contextKey)

  const [input, setInput] = useState("")
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const lastTypingSentRef = useRef<number>(0)

  // 1. ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ ДЛЯ СЧЕТЧИКА
  const { data: allDialogs } = useQuery<ChatDialog[]>({
    queryKey: ["dialogs"],
    queryFn: () => [], // Заглушка, данные придут из кэша
    enabled: false,    // Не делать запрос самостоятельно
    initialData: () => queryClient.getQueryData(["dialogs"]), // Берем текущее состояние
  });
  const unreadCount = useMemo(() => {
    if (!allDialogs) return 0
    const currentDialog = allDialogs.find(d =>
      orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId
    )
    return currentDialog?.unreadCount || 0
  }, [allDialogs, partnerId, orderId])

  // 2. ЗАГРУЗКА СООБЩЕНИЙ
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<InfiniteMessagesResponse>({
    queryKey,
    queryFn: ({ pageParam }) => getMessages({ recipientId: partnerId, orderId, cursor: pageParam as string | undefined, limit: 30 }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const messages = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.messages) || []
    return [...all].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [data?.pages])

  const { data: typingData } = useQuery({
    queryKey: ["typing", contextKey],
    queryFn: () => ({ isTyping: false }),
    initialData: { isTyping: false },
    staleTime: Infinity
  })

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight + 10000, behavior })
    }
  }

  // 3. ВОССТАНОВЛЕНИЕ ПОЗИЦИИ
  // 1. Убираем всё лишнее из тела хука. Оставляем только один эффект.

  useLayoutEffect(() => {
    // ШАГ 1: Если мы переключили чат или данные еще грузятся — выключаем видимость
    // Это предотвращает вспышку старого контента
    if (isLoading) {
      setIsReady(false);
      return;
    }

    // ШАГ 2: Если данные загружены и DOM-узел готов
    if (scrollRef.current) {
      const savedPos = scrollPositions[contextKey];
      const wasStick = isStickToBottomMap[contextKey];

      // Выставляем скролл (синхронно, до отрисовки)
      if (wasStick === true || savedPos === undefined) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        isStickToBottomMap[contextKey] = true;
      } else {
        scrollRef.current.scrollTop = savedPos;
      }

      // ШАГ 3: Теперь, когда скролл на месте, "включаем" чат
      setIsReady(true);
    }
  }, [contextKey, isLoading, messages.length]);
  // messages.length важен, чтобы скролл пересчитался, когда сообщения реально отрисовались


  // 4. ОБРАБОТКА СКРОЛЛА
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const fromBottom = scrollHeight - scrollTop - clientHeight
    const isBottom = fromBottom < 80;

    scrollPositions[contextKey] = scrollTop;
    isStickToBottomMap[contextKey] = isBottom;

    // Скрываем кнопку, если мы внизу
    setShowScrollButton(!isBottom && fromBottom > 200);

    // Логика прочтения
    if (isBottom) {
      const unreadFromPartner = messages.filter(m => m.senderId === partnerId && !m.isRead)
      if (unreadFromPartner.length > 0) {
        // Оптимистично красим бабблы
        queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
          if (!old) return old
          return { ...old, pages: old.pages.map(p => ({ ...p, messages: p.messages.map(m => m.senderId === partnerId ? { ...m, isRead: true } : m) })) }
        })
        // Обнуляем счетчик в Navbar и Dialogs (локально до Pusher)
        queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => ({ ...old, count: Math.max(0, (old?.count || 0) - unreadFromPartner.length) }))
        queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => old?.map(d => (orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId) ? { ...d, unreadCount: 0 } : d))

        markMessagesAsRead(partnerId, orderId)
      }
    }
  }

  // 5. ОТПРАВКА
  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ recipientId: partnerId, text, orderId }),
    onMutate: async (newText) => {
      await queryClient.cancelQueries({ queryKey });
      const optimisticMsg: MessageWithSender = {
        id: `temp-${Date.now()}`, text: newText, senderId: currentUserId, recipientId: partnerId, orderId: orderId || null,
        createdAt: new Date(), updatedAt: new Date(), isRead: false, isOptimistic: true,
        sender: { id: currentUserId, name: "Вы", image: null }
      };

      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old || !old.pages.length) return { pages: [{ messages: [optimisticMsg], nextCursor: null }], pageParams: [undefined] };
        return { ...old, pages: old.pages.map((p, i) => i === 0 ? { ...p, messages: [...p.messages, optimisticMsg] } : p) };
      });

      setInput("");
      isStickToBottomMap[contextKey] = true;
      requestAnimationFrame(() => scrollToBottom("smooth"));
    },
    onSuccess: (response) => {
      if (!response.data) return;
      const realMsg = response.data;
      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map(page => ({ ...page, messages: page.messages.map(m => (m.isOptimistic && m.text === realMsg.text) ? realMsg : m) })) };
      });
      queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
        if (!old) return old;
        return old.map(d => (orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId) ? { ...d, lastMessage: realMsg } : d);
      });
    }
  });

  // 6. УМНЫЙ ЯКОРЬ (БЕЗ РУЧНОГО СЧЕТЧИКА)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg?.id || !isReady) return

    const isMe = lastMsg.senderId === currentUserId
    const stickToBottom = isStickToBottomMap[contextKey]

    if (isMe || stickToBottom) {
      requestAnimationFrame(() => scrollToBottom("smooth"))
    }
  }, [messages[messages.length - 1]?.id, isReady, contextKey])

  const handleInputChange = (val: string) => {
    setInput(val)
    const now = Date.now()
    if (now - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = now
      sendTypingStatus(partnerId, contextKey)
    }
  }

  const hasClientStarted = useMemo(() => {
    if (!orderId) return true
    return messages.some(m => m.senderId !== currentUserId || m.orderId === orderId)
  }, [messages, orderId, currentUserId])

  return {
    messages, input, setInput, isTyping: typingData?.isTyping, unreadCount,
    showScrollButton, isReady, setIsReady, scrollRef, handleScroll,
    handleInputChange, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
    handleSendMessage: () => { if (input.trim() && !mutation.isPending) mutation.mutate(input) },
    mutation, scrollToBottom, hasClientStarted, contextKey
  }
}
