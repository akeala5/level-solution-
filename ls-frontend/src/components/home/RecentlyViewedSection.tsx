'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, X, Package } from 'lucide-react'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { formatPrice, imgBlurDataURL } from '@/lib/utils'

export default function RecentlyViewedSection() {
  const { items, clearItems } = useRecentlyViewed()

  if (items.length === 0) return null

  return (
    <section className="container-custom pb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-dark">
          <Clock size={16} className="text-muted" />
          Récemment consultés
        </h2>
        <button
          onClick={clearItems}
          className="flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
        >
          <X size={12} /> Effacer
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ scrollbarWidth: 'none' }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.slug}`}
            className="shrink-0 w-36 bg-white rounded-xl border border-border hover:border-primary/40 hover:shadow-card transition-all group"
          >
            <div className="relative aspect-[4/3] bg-surface rounded-t-xl overflow-hidden">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="144px"
                  placeholder="blur"
                  blurDataURL={imgBlurDataURL}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={22} className="text-muted/30" />
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-medium text-dark line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
              {item.city && (
                <p className="text-[10px] text-muted mt-0.5 truncate">{item.city}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
