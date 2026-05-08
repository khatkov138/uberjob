// store/use-feed-data-store.ts
import { create } from "zustand";

interface FeedDataState {
  totalCount: number;
  isFetching: boolean;
  setStats: (total: number, isFetching: boolean) => void;
}

export const useFeedDataStore = create<FeedDataState>((set) => ({
  totalCount: 0,
  isFetching: false,
  setStats: (total, isFetching) => set((state) => {
    if (state.totalCount === total && state.isFetching === isFetching) return state;
    return { totalCount: total, isFetching };
  }),
}));
