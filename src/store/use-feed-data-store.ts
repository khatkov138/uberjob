// store/use-feed-data-store.ts
import { create } from "zustand";

interface FeedDataState {
  totalCount: number;
  loadedCount: number; // <-- Добавляем сколько загружено
  isFetching: boolean;
  setStats: (total: number, loaded: number, isFetching: boolean) => void;
}

export const useFeedDataStore = create<FeedDataState>((set) => ({
  totalCount: 0,
  loadedCount: 0,
  isFetching: false,
  setStats: (total, loaded, isFetching) => set((state) => {
    // Добавляем проверку loadedCount, чтобы не спамить ререндерами
    if (
      state.totalCount === total && 
      state.loadedCount === loaded && 
      state.isFetching === isFetching
    ) return state;
    
    return { totalCount: total, loadedCount: loaded, isFetching };
  }),
}));
