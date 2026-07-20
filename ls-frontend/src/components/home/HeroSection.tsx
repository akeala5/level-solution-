'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Shield, Zap, Award, Plus, LayoutGrid, Flame, ArrowRight, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import ProductImage from '@/components/product/ProductImage'

const TRENDING = ['RTX 4080', 'MacBook Pro', 'iPhone recondit.', 'Switch réseau', 'Écran 4K']
const CONDITION: Record<string, string> = {
  NEW: 'Neuf', VERY_GOOD: 'Très bon état', GOOD: 'Bon état', FAIR: 'État correct', FOR_PARTS: 'Pour pièces',
}
const PER_PAGE = 6

function HotCard({ p }: { p?: Product }) {
  if (!p) {
    return (
      <div className="rounded-xl overflow-hidden bg-card border border-border animate-pulse">
        <div className="aspect-[16/9] bg-surface" />
        <div className="p-2 space-y-1.5"><div className="h-2.5 bg-surface rounded w-3/4" /><div className="h-2.5 bg-surface rounded w-1/2" /></div>
      </div>
    )
  }
  const disc = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0
  const label = p.isReconditioned ? 'Reconditionné LS' : (CONDITION[p.condition] || '')
  return (
    <Link href={`/products/${p.slug}`}
      className="group rounded-xl overflow-hidden bg-card border border-border shadow-card hover:shadow-card-hover transition-shadow">
      <div className="relative aspect-[16/9] bg-surface">
        {disc > 0 && <span className="absolute top-1.5 left-1.5 z-10 bg-danger text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">-{disc}%</span>}
        <ProductImage src={p.images?.[0]?.url || '/placeholder.svg'} alt={p.title} fill className="object-cover" sizes="240px" />
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-semibold text-dark leading-tight line-clamp-1 mb-0.5">{p.title}</p>
        <div className="text-[13.5px] font-extrabold text-primary">{formatPrice(p.price)}</div>
        {label && <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted"><span className="w-1.5 h-1.5 rounded-full bg-accent" />{label}</div>}
      </div>
    </Link>
  )
}

export default function HeroSection() {
  const router = useRouter()
  const t = useTranslations('hero')

  const { data: hot } = useQuery({
    queryKey: ['hero-hot'],
    queryFn: () => api.get('/products', { params: { sortBy: 'popular', limit: 12 } }).then((r) => r.data.data as Product[]),
    staleTime: 5 * 60 * 1000,
  })

  // Pool découpé en pages de 6 ; défilement auto (fondu) entre les pages.
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
    <section className="relative overflow-hidden bg-[#12294A] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: 'radial-gradient(1100px 340px at 78% -40%, rgba(39,174,96,.16), transparent 60%)' }} />

      <div className="container-custom relative z-10 py-8 lg:py-10">
        <div className="grid lg:grid-cols-2 gap-8 items-center">

          {/* Gauche : accroche + tendances + CTA (plus de barre de recherche : le topbar la porte) */}
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#CFE9DB] bg-accent/15 border border-accent/30 px-3 py-1.5 rounded-full mb-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" /> {t('badge')}
            </span>

            <h1 className="text-3xl lg:text-[40px] font-extrabold leading-[1.08] tracking-tight mb-3 text-white">
              {t('title_part1')} <span className="text-accent">{t('title_highlight')}</span> {t('title_part2')}
            </h1>

            <p className="text-[#AFC0D8] text-[15px] leading-relaxed mb-5 max-w-[46ch]">{t('subtitle')}</p>

            <div className="flex flex-wrap gap-2 mb-5">
              {[{ icon: Shield, text: t('trust_escrow') }, { icon: Zap, text: t('trust_mobile') }, { icon: Award, text: t('trust_verified') }].map(({ icon: Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#DCE6F3] bg-white/[0.06] border border-white/[0.12] px-3 py-1.5 rounded-full">
                  <Icon size={15} className="text-accent" /> {text}
                </span>
              ))}
            </div>

            {/* CTA principal */}
            <div className="flex flex-wrap gap-3 mb-5">
              <Link href="/products" className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-accent hover:bg-accent-600 text-white font-bold text-[14.5px] transition-colors">
                <LayoutGrid size={18} /> {t('cta_browse')}
              </Link>
              <Link href="/products/create" className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.16] font-semibold text-[14.5px] transition-colors">
                <Plus size={17} /> {t('cta_sell')}
              </Link>
            </div>

            {/* Tendances = raccourcis de recherche */}
            <div className="flex items-center flex-wrap gap-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 text-white/50"><TrendingUp size={14} /> {t('trending')}</span>
              {TRENDING.map((term) => (
                <button key={term} onClick={() => router.push(`/products?search=${encodeURIComponent(term)}`)}
                  className="text-[#CBD8EC] bg-white/[0.06] hover:bg-white/[0.13] hover:text-white border border-white/[0.10] px-3 py-1 rounded-full transition-colors">{term}</button>
              ))}
            </div>
          </div>

          {/* Droite : vitrine « En ce moment » — 6 vrais produits qui défilent (visuel principal du hero) */}
          <div className="hidden lg:block rounded-2xl bg-white/[0.05] border border-white/[0.10] p-4 animate-fade-in"
            onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="flex items-center justify-between px-1 mb-3">
              <span className="flex items-center gap-2 font-bold text-[14px] text-white/95"><Flame size={16} className="text-amber-400" /> En ce moment</span>
              <Link href="/products?sortBy=popular" className="text-[12px] text-white/60 hover:text-white flex items-center gap-1">Voir tout <ArrowRight size={12} /></Link>
            </div>
            <div key={page} className="grid grid-cols-2 gap-3 animate-fade-in">
              {(pages[page] ?? []).map((p, i) => <HotCard key={p?.id ?? i} p={p} />)}
            </div>
            {pages.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3.5">
                {pages.map((_, i) => (
                  <button key={i} onClick={() => setPage(i)} aria-label={`Page ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === page ? 'w-4 bg-accent' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
