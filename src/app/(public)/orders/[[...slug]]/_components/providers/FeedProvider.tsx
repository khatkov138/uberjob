// providers/FeedProvider.tsx
'use client'


import { createFeedStore, FeedProps, FeedState } from "@/store/use-feed-store"
import { createContext, useContext, useRef, ReactNode } from "react"
import { useStore } from "zustand"

type FeedStoreApi = ReturnType<typeof createFeedStore>
export const FeedStoreContext = createContext<FeedStoreApi | undefined>(undefined)

export function FeedProvider({ children, initialData }: { children: ReactNode, initialData: FeedProps }) {
  const storeRef = useRef<FeedStoreApi>(null)

  if (!storeRef.current) {
    // Инъекция данных прямо в конструктор стора
    storeRef.current = createFeedStore(initialData)
  }

  return (
    <FeedStoreContext.Provider value={storeRef.current}>
      {children}
    </FeedStoreContext.Provider>
  )
}

// Внутренний хук для Контроллера
export function useFeedStore<T>(selector: (state: FeedState) => T): T {
  const context = useContext(FeedStoreContext)
  if (!context) throw new Error('useFeedStore must be used within FeedProvider')
  return useStore(context, selector)
}
