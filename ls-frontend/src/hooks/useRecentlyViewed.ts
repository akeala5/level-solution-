import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

const MAX_ITEMS = 8
const STORAGE_KEY = 'ls_recently_viewed'

export interface RecentProduct {
  id: string
  slug: string
  title: string
  price: number
  imageUrl?: string
  sellerName?: string
  city?: string
  viewedAt: number
}

export function useRecentlyViewed() {
  const [items, setItems] = useLocalStorage<RecentProduct[]>(STORAGE_KEY, [])

  const addItem = useCallback(
    (product: {
      id: string
      slug: string
      title: string
      price: number
      images?: { url?: string; thumbnailUrl?: string }[]
      seller?: { firstName?: string; sellerProfile?: { shopName?: string } | null } | null
      city?: string | null
    }) => {
      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== product.id)
        const item: RecentProduct = {
          id: product.id,
          slug: product.slug,
          title: product.title,
          price: product.price,
          imageUrl: product.images?.[0]?.url || product.images?.[0]?.thumbnailUrl,
          sellerName: product.seller?.sellerProfile?.shopName || product.seller?.firstName,
          city: product.city ?? undefined,
          viewedAt: Date.now(),
        }
        return [item, ...filtered].slice(0, MAX_ITEMS)
      })
    },
    [setItems],
  )

  const clearItems = useCallback(() => setItems([]), [setItems])

  return { items, addItem, clearItems }
}
