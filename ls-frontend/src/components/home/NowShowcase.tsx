'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flame, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import ProductImage from '@/components/product/ProductImage'

const CONDITION: Record<string, string> = {
  NEW: 'Neuf', VERY_GOOD: 'Très bon état', GOOD: 'Bon état', FAIR: 'État correct', FOR_PARTS: 'Pour pièces',
}
const PER_PAGE = 6

function HotCard({ p }: { p?: Product }) {
  if (!p) {
    return (
      <div className="flex rounded-xl overflow-hidden bg-card border border-border animate-pulse">
        <div className="w-28 md:w-32 min-h-[96px] self-stretch bg-surface shrink-0" />
        <div className="p-3 flex-1 space-y-2"><div className="h-3 bg-surface rounded w-3/4" /><div className="h-3 bg-surface rounded w-1/2" /></div>
      </div>
    )
  }
  const disc = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0
  const label = p.isReconditioned ? 'Reconditionné LS' : (CONDITION[p.condition] || '')
  return (
    <Link href={`/products/${p.slug}`}
      className="group flex rounded-xl overflow-hidden bg-card border border-border shadow-card hover:shadow-card-hover transition-shadow">
      <div className="relative w-28 md:w-32 min-h-[96px] self-stretch bg-surface shrink-0">
        {disc > 0 && <span className="absolute top-1.5 left-1.5 z-10 bg-danger text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">-{disc}%</span>}
        <ProductImage src={p.images?.[0]?.url || '/placeholder.svg'} alt={p.title} fill className="object-cover" sizes="128px" />
      </div>
      <div className="p-3 flex flex-col justify-center min-w-0">
        <p className="text-[13px] font-semibold text-dark leading-tight line-clamp-1 mb-1">{p.title}</p>
        <div className="text-[15px] font-extrabold text-primary">{formatPrice(p.price)}</div>
        {label && <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted"><span className="w-1.5 h-1.5 rounded-full bg-accent" />{label}</div>}
      </div>
    </Link>
  )
}

// Vitrine « En ce moment » — sortie du hero, pleine largeur, grille 3×2.
// Défilement auto par pages de 6 (fondu, pause au survol, points, reduced-motion).
export default function NowShowcase() {
  const { data: hot } = useQuery({
    queryKey: ['hero-hot'],
    queryFn: () => api.get('/products', { params: { sortBy: 'popular', limit: 12 } }).then((r) => r.data.data as Product[]),
    staleTime: 5 * 60 * 1000,
  })

  const pool = hot ?? []
  const pages: (Product | undefined)[][] = pool.length
    ? Array.from({ length: Math.ceil(pool.length / PER_PAGE) }, (_, i) => pool.slice(i * PER_PAGE, (i + 1) * PER_PAGE))
    : [Array(PER_PAGE).fill(undefined)]

  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => { if (page >= pages.length) setPage(0) }, [pages.length, page])

  useEffect(() => {
    if (pages.length <= 1 || paused) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setPage((p) => (p + 1) % pages.length), 5000)
    return () => clearInterval(timer)
  }, [pages.length, paused])

  return (
    <section className="container-custom mt-8 mb-14" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[19px] font-extrabold text-dark flex items-center gap-2"><Flame size={19} className="text-amber-500" /> En ce moment</h2>
        {pages.length > 1 && (
          <div className="flex gap-1.5 ml-1">
            {pages.map((_, i) => (
              <button key={i} onClick={() => setPage(i)} aria-label={`Page ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === page ? 'w-4 bg-accent' : 'w-1.5 bg-border hover:bg-muted'}`} />
            ))}
          </div>
        )}
        <Link href="/products?sortBy=popular" className="ml-auto text-[13px] font-bold text-accent flex items-center gap-1.5 whitespace-nowrap">Voir tout <ArrowRight size={16} /></Link>
      </div>
      <div key={page} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-fade-in">
        {(pages[page] ?? []).map((p, i) => <HotCard key={p?.id ?? i} p={p} />)}
      </div>
    </section>
  )
}
