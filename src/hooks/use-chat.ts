"use client"
import { useState, useRef, useMemo, useEffect } from "react"
import { useInfiniteQuery, useQueryClient, useMutation, useQuery, InfiniteData } from "@tanstack/react-query"
import { getMessages, markMessagesAsRead, sendMessage, sendTypingStatus } from "@/actions/chat/message"
import { getContextKey, getMessagesQueryKey } from "@/lib/utils"
import { ChatDialog, InfiniteMessagesResponse, MessageWithSender } from "@/lib/types/chat"

export function useChat(partnerId: string, orderId: string | undefined, currentUserId: string) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastTypingSentRef = useRef<number>(0)

  const contextKey = useMemo(() => getContextKey(orderId, currentUserId, partnerId), [orderId, currentUserId, partnerId])
  const queryKey = getMessagesQueryKey(contextKey)

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
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight + 10000, behavior })
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    const now = Date.now()
    if (now - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = now
      sendTypingStatus(partnerId, contextKey)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 150)
    if (scrollHeight - scrollTop - clientHeight < 50) {
      const unread = messages.filter(m => m.senderId === partnerId && !m.isRead)
      if (unread.length > 0) {
        setUnreadCount(0)
        queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
          if (!old) return old
          return { ...old, pages: old.pages.map(p => ({ ...p, messages: p.messages.map(m => m.senderId === partnerId ? { ...m, isRead: true } : m) })) }
        })
        queryClient.setQueryData<{ count: number }>(["unread-count"], (old) => ({ ...old, count: Math.max(0, (old?.count || 0) - unread.length) }))
        markMessagesAsRead(partnerId, orderId)
      }
    }
  }

  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ recipientId: partnerId, text, orderId }),

    onMutate: async (newText) => {
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
        sender: {
          id: currentUserId,
          name: "Вы",
          image: null,
        }
      };

      // Обновляем сообщения (в этой вкладке, Broadcast разнесет остальным)
      queryClient.setQueryData<InfiniteData<InfiniteMessagesResponse>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((p, i) => i === 0 ? { ...p, messages: [...p.messages, optimisticMsg] } : p)
        };
      });

      setInput("");
      requestAnimationFrame(() => scrollToBottom("auto"));

      return { optimisticMsg };
    },

    onSuccess: (response) => {
      if (!response.data) return;
      const realMsg = response.data;

      // ТОЧЕЧНАЯ ЗАМЕНА: Никаких invalidate! 
      // Просто заменяем temp на real, чтобы анимация не дергалась
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

      // Список диалогов тоже обновляем в памяти
      queryClient.setQueryData<ChatDialog[]>(["dialogs"], (old) => {
        if (!old) return old;
        return old.map(d => {
          const isMatch = orderId ? d.lastMessage?.orderId === orderId : d.partner.id === partnerId;
          return isMatch ? { ...d, lastMessage: realMsg } : d;
        });
      });
    }
  });

  useEffect(() => {
    if (messages[messages.length - 1]?.id && isReady) {
      requestAnimationFrame(() => scrollToBottom("smooth"))
      setUnreadCount(0)
    }
  }, [messages[messages.length - 1]?.id])

  const hasClientStarted = useMemo(() => {
    if (!orderId) return true
    return messages.some(m => m.orderId === orderId) || currentUserId === partnerId // упрощенная логика
  }, [messages, orderId])

  return {
    messages, input, setInput, isTyping: typingData?.isTyping, unreadCount, setUnreadCount,
    showScrollButton, isReady, setIsReady, scrollRef, handleScroll,
    handleInputChange, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
    handleSendMessage: () => { if (input.trim() && !mutation.isPending) mutation.mutate(input) },
    mutation, scrollToBottom, hasClientStarted
  }
}
