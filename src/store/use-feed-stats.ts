// store/use-feed-stats-store.ts
import { create } from "zustand";

interface FeedStatsState {
  totalCount: number;
  loadedCount: number;
  isFetching: boolean;
  setStats: (total: number, loaded: number, isFetching: boolean) => void;
  reset: () => void;
}

export const useFeedStatsStore = create<FeedStatsState>((set) => ({
  totalCount: -1, // Маркер "Первичный вакуум"
  loadedCount: 0,
  isFetching: false,

  setStats: (total, loaded, isFetching) => set((state) => {
    // Педантичная проверка, чтобы не дергать даже маленькие атомы зря
    if (
      state.totalCount === total && 
      state.loadedCount === loaded && 
      state.isFetching === isFetching
    ) return state;

    return { totalCount: total, loadedCount: loaded, isFetching };
  }),

  reset: () => set({ 
    totalCount: 0, 
    loadedCount: 0, 
    isFetching: false 
  }),
}));
