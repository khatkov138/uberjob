// store/use-feed-stats-store.ts
import { create } from "zustand";

interface FeedStatsState {
  totalCount: number | null; // null — данных еще не было (даже с сервера)
  loadedCount: number;
  isFetching: boolean;
  setStats: (total: number, loaded: number, isFetching: boolean) => void;
  reset: () => void;
}

export const useFeedStatsStore = create<FeedStatsState>((set) => ({
  totalCount: null, // Изначально "Пусто"
  loadedCount: 0,
  isFetching: true,

  setStats: (total, loaded, isFetching) => set((state) => {
    // Педантичный Guard Clause: исключаем лишние циклы рендеринга
    if (
      state.totalCount === total && 
      state.loadedCount === loaded && 
      state.isFetching === isFetching
    ) return state;

    return { 
        totalCount: total, 
        loadedCount: loaded, 
        isFetching 
    };
  }),

  reset: () => set({ 
    totalCount: null, 
    loadedCount: 0, 
    isFetching: true
  }),
}));
