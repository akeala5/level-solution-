import { create } from 'zustand'
import { Product } from '@/types'

const MAX = 4

interface CompareState {
  items: Product[]
  isOpen: boolean
  addItem: (product: Product) => void
  removeItem: (id: string) => void
  clearItems: () => void
  isInCompare: (id: string) => boolean
  openDrawer: () => void
  closeDrawer: () => void
}

export const useCompareStore = create<CompareState>()((set, get) => ({
  items: [],
  isOpen: false,
  addItem: (product) => {
    const { items } = get()
    if (items.find((i) => i.id === product.id)) return
    if (items.length >= MAX) return
    set({ items: [...items, product] })
  },
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clearItems: () => set({ items: [], isOpen: false }),
  isInCompare: (id) => get().items.some((i) => i.id === id),
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
}))
