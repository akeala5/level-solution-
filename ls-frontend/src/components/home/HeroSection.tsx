'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, Shield, Zap, Award, Plus, LayoutGrid, Flame, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import ProductImage from '@/components/product/ProductImage'

const TRENDING = ['RTX 4080', 'MacBook Pro', 'iPhone recondit.', 'Switch réseau']
const CONDITION: Record<string, string> = {
  NEW: 'Neuf', VERY_GOOD: 'Très bon état', GOOD: 'Bon état', FAIR: 'État correct', FOR_PARTS: 'Pour pièces',
}

function HotCard({ p }: { p?: Product }) {
  if (!p) {
    return (
      <div className="rounded-xl overflow-hidden bg-card border border-border animate-pulse">
        <div className="aspect-[4/3] bg-surface" />
        <div className="p-2.5 space-y-2"><div className="h-3 bg-surface rounded w-3/4" /><div className="h-3 bg-surface rounded w-1/2" /></div>
      </div>
    )
  }
  const disc = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0
  const label = p.isReconditioned ? 'Reconditionné LS' : (CONDITION[p.condition] || '')
  return (
    <Link href={`/products/${p.slug}`}
      className="group rounded-xl overflow-hidden bg-card border border-border shadow-card hover:shadow-card-hover transition-shadow">
      <div className="relative aspect-[4/3] bg-surface">
        {disc > 0 && <span className="absolute top-1.5 left-1.5 z-10 bg-danger text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">-{disc}%</span>}
        <ProductImage src={p.images?.[0]?.url || '/placeholder.svg'} alt={p.title} fill className="object-cover" sizes="200px" />
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-semibold text-dark leading-tight line-clamp-1 mb-1">{p.title}</p>
        <div className="text-[13.5px] font-extrabold text-primary">{formatPrice(p.price)}</div>
        {label && <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-muted"><span className="w-1.5 h-1.5 rounded-full bg-accent" />{label}</div>}
      </div>
    </Link>
  )
}

export default function HeroSection() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const t = useTranslations('hero')

  const { data: hot } = useQuery({
    queryKey: ['hero-hot'],
    queryFn: () => api.get('/products', { params: { sortBy: 'popular', limit: 4 } }).then((r) => r.data.data as Product[]),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(search.trim() ? `/products?search=${encodeURIComponent(search)}` : '/products')
  }

  const hotList = hot ? hot.slice(0, 4) : [undefined, undefined, undefined, undefined]

  return (
    <section className="relative overflow-hidden bg-[#12294A] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: 'radial-gradient(1100px 340px at 78% -40%, rgba(39,174,96,.16), transparent 60%)' }} />

      <div className="container-custom relative z-10 py-8 lg:py-10">
        <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-center">

          {/* Gauche : accroche + recherche */}
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#CFE9DB] bg-accent/15 border border-accent/30 px-3 py-1.5 rounded-full mb-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" /> {t('badge')}
            </span>

            <h1 className="text-3xl lg:text-[38px] font-extrabold leading-[1.08] tracking-tight mb-3 text-white">
              {t('title_part1')} <span className="text-accent">{t('title_highlight')}</span> {t('title_part2')}
            </h1>

            <p className="text-[#AFC0D8] text-[15px] leading-relaxed mb-4 max-w-[44ch]">{t('subtitle')}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {[{ icon: Shield, text: t('trust_escrow') }, { icon: Zap, text: t('trust_mobile') }, { icon: Award, text: t('trust_verified') }].map(({ icon: Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#DCE6F3] bg-white/[0.06] border border-white/[0.12] px-3 py-1.5 rounded-full">
                  <Icon size={15} className="text-accent" /> {text}
                </span>
              ))}
            </div>

            <form onSubmit={handleSearch} className="flex bg-card rounded-2xl overflow-hidden h-14 max-w-[560px] shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search_placeholder')}
                className="flex-1 bg-transparent text-dark placeholder:text-muted px-5 text-[15.5px] focus:outline-none" aria-label={t('search_placeholder')} />
              <button type="submit" className="bg-accent hover:bg-accent-600 text-white font-bold text-[14.5px] px-6 flex items-center gap-2 transition-colors">
                <Search size={18} /> <span className="hidden sm:inline">{t('search_btn')}</span>
              </button>
            </form>

            <div className="flex items-center flex-wrap gap-2 mt-3.5 text-[12.5px]">
              <span className="text-white/50">{t('trending')}</span>
              {TRENDING.map((term) => (
                <button key={term} onClick={() => router.push(`/products?search=${encodeURIComponent(term)}`)}
                  className="text-[#CBD8EC] bg-white/[0.06] hover:bg-white/[0.13] hover:text-white border border-white/[0.10] px-3 py-1 rounded-full transition-colors">{term}</button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/products/create" className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-accent hover:bg-accent-600 text-white font-bold text-[14.5px] transition-colors">
                <Plus size={18} /> {t('cta_sell')}
              </Link>
              <Link href="/products" className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.16] font-semibold text-[14.5px] transition-colors">
                <LayoutGrid size={17} /> {t('cta_browse')}
              </Link>
            </div>
          </div>

          {/* Droite : En ce moment (vrais produits) */}
          <div className="hidden lg:block rounded-2xl bg-white/[0.05] border border-white/[0.10] p-3.5 animate-fade-in">
            <div className="flex items-center justify-between px-1 mb-3">
              <span className="flex items-center gap-2 font-bold text-[13.5px] text-white/95"><Flame size={16} className="text-amber-400" /> En ce moment</span>
              <Link href="/products?sortBy=popular" className="text-[12px] text-white/60 hover:text-white flex items-center gap-1">Voir tout <ArrowRight size={12} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {hotList.map((p, i) => <HotCard key={p?.id ?? i} p={p} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
