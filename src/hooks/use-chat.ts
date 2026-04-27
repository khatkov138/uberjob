"use client"

import { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from "react"
import { useInfiniteQuery, useQueryClient, useMutation, useQuery, InfiniteData } from "@tanstack/react-query"
import { getMessages, markMessagesAsRead, sendMessage, sendTypingStatus } from "@/actions/chat/message"
import { getContextKey, getMessagesQueryKey, handleAction } from "@/lib/utils"
import { ChatDialog, InfiniteMessagesResponse, MessageWithSender } from "@/lib/types/chat"
import { toast } from "sonner"

const scrollPositions: Record<string, number> = {};

export function useChat(partnerId: string, orderId: string | undefined, currentUserId: string) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const intObserver = useRef<IntersectionObserver | null>(null)
  const lastRestoredKey = useRef<string | null>(null)
  const lastTypingSentRef = useRef<number>(0)

  const contextKey = useMemo(() => getContextKey(orderId, currentUserId, partnerId), [orderId, currentUserId, partnerId])
  const queryKey = getMessagesQueryKey(contextKey)

  const [input, setInput] = useState("")
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // 1. ЗАГРУЗКА
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<InfiniteMessagesResponse>({
    queryKey,
    queryFn: ({ pageParam }) => getMessages({ recipientId: partnerId, orderId, cursor: pageParam as string | undefined, limit: 30 }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const messages = useMemo(() => {
    return data?.pages.flatMap((page) => page.messages) || []
  }, [data?.pages])

  // 2. ВОССТАНОВЛЕНИЕ ПОЗИЦИИ
  if (lastRestoredKey.current !== contextKey && isReady) {
    setIsReady(false)
  }

  useLayoutEffect(() => {
    if (isLoading || messages.length === 0 || !scrollRef.current) return
    if (lastRestoredKey.current === contextKey && isReady) return

    const container = scrollRef.current
    const savedPos = scrollPositions[contextKey]

    container.style.scrollBehavior = 'auto'
    // В column-reverse 0 — это низ. Если позиции нет, браузер сам оставит в 0, 
    // но мы форсируем для надежности.
    container.scrollTop = savedPos !== undefined ? savedPos : 0

    lastRestoredKey.current = contextKey
    setIsReady(true)
  }, [contextKey, isLoading, messages.length])

  // 3.
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!isReady) return;

    const { scrollTop } = e.currentTarget;
    const absScroll = Math.abs(scrollTop);

    // 1. Сохраняем позицию
    scrollPositions[contextKey] = scrollTop;

    // 2. Кнопка исчезает только когда мы совсем близко к низу (например, 80px)
    // А появляется, если мы ушли выше чем на 200px
    setShowScrollButton(absScroll > 100);

  }, [contextKey, isReady]);

  // 1. Создаем единую функцию прочтения
  const handleRead = useCallback(() => {
    if (!isReady) return;

    const hasUnread = messages.some(m => m.senderId === partnerId && !m.isRead);

    // В режиме column-reverse низ — это scrollTop: 0. 
    const container = scrollRef.current;
    const isAtBottom = container ? Math.abs(container.scrollTop) < 100 : false;

    // Условие: есть что читать + мы внизу + окно активно
    if (hasUnread && isAtBottom && document.hasFocus()) {
      console.log("Прочтение сработало!");
      markMessagesAsRead(partnerId, orderId);

      // Оптимистично чистим счетчики в боковой панели
      queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) =>
        old?.map(d => (orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId)
          ? { ...d, unreadCount: 0 }
          : d
        )
      );

      // Оптимистично красим бабблы в самом чате
      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            messages: page.messages.map(m => m.senderId === partnerId ? { ...m, isRead: true } : m)
          }))
        };
      });
    }
  }, [messages, partnerId, orderId, isReady, queryClient, queryKey]);

  // 2. Добавляем "добивку" при возвращении на вкладку
  useEffect(() => {
    const onFocus = () => handleRead();
    window.addEventListener("focus", onFocus);
    // Вызываем один раз при монтировании/смене чата на случай, если мы уже внизу
    handleRead();

    return () => window.removeEventListener("focus", onFocus);
  }, [handleRead]);



  // 4. ПОЛНАЯ МУТАЦИЯ ОТПРАВКИ
  const mutation = useMutation({
    // 1. mutationFn: обрабатываем ответ от Server Action
    mutationFn: async (text: string) => handleAction(sendMessage({ recipientId: partnerId, text, orderId })),

    // 2. onMutate: мгновенно добавляем сообщение в интерфейс
    onMutate: async (newText) => {
      setInput("");

      await queryClient.cancelQueries({ queryKey });

      const optimisticMsg: MessageWithSender = {
        id: `temp-${Date.now()}`,
        text: newText,
        senderId: currentUserId,
        recipientId: partnerId,
        orderId: orderId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isRead: false,
        isOptimistic: true,
        sender: { id: currentUserId, name: "Вы", image: null }
      };

      // Сохраняем предыдущие данные для отката при ошибке
      const previousMessages = queryClient.getQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey);

      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return { pages: [{ messages: [optimisticMsg], nextCursor: null }], pageParams: [undefined] };
        return {
          ...old,
          pages: old.pages.map((p, i) =>
            i === 0 ? { ...p, messages: [optimisticMsg, ...p.messages] } : p
          )
        };
      });

      // Прокрутка вниз
      if (scrollRef.current) scrollRef.current.scrollTop = 0;

      return { previousMessages };
    },

    // 3. onSuccess: заменяем "темп" на реальный объект из БД
    onSuccess: (realMsg) => {

      // realMsg уже не null благодаря проверке в mutationFn
      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            messages: page.messages.map(m =>
              (m.isOptimistic && m.text === realMsg.text) ? realMsg : m
            )
          }))
        };
      });

      // Обновляем список диалогов (последнее сообщение)
      queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
        if (!old) return old;
        return old.map(d =>
          (orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId)
            ? { ...d, lastMessage: realMsg }
            : d
        );
      });
    },

    // 4. onError: если сервер отклонил (спам, мат, ошибка БД)
    onError: (err, newText, context) => {
      setInput(newText)
      toast.error(err.message);

      // Откатываем кэш к состоянию до отправки
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages);
      }
    },


  });


  // 5. ОСТАЛЬНОЕ
  const handleSendMessage = () => { if (input.trim() && !mutation.isPending) mutation.mutate(input) }

  const handleInputChange = (val: string) => {
    setInput(val)
    if (Date.now() - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = Date.now()
      sendTypingStatus(partnerId, contextKey)
    }
  }


  const topAnchorRef = useCallback((node: HTMLDivElement | null) => {
    if (!hasNextPage || isFetchingNextPage) return
    if (intObserver.current) intObserver.current.disconnect()
    intObserver.current = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) fetchNextPage()
    }, { threshold: 0.1 })
    if (node) intObserver.current.observe(node)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const scrollToBottom = () => { if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" }) }

  const { data: typingData } = useQuery({ queryKey: ["typing", contextKey], queryFn: () => ({ isTyping: false }), initialData: { isTyping: false }, staleTime: Infinity })
  const allDialogs = queryClient.getQueryData<ChatDialog[]>(["dialogs"])
  const unreadCount = allDialogs?.find(d => orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId)?.unreadCount || 0

  return {
    messages, input, setInput, isTyping: typingData?.isTyping,
    unreadCount, showScrollButton, isReady, isLoading, isFetchingNextPage, hasNextPage,
    scrollRef, handleScroll, handleInputChange, handleSendMessage, topAnchorRef, scrollToBottom, mutation, handleRead,
  }
}
