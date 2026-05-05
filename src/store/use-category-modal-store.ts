// store/use-category-modal-store.ts
import { create } from 'zustand'

interface CategoryModalState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useCategoryModalStore = create<CategoryModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
