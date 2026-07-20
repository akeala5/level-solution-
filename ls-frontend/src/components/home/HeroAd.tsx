'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Megaphone, ArrowRight, Crown, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import ProductImage from '@/components/product/ProductImage'

interface Ad {
  id: string
  product: {
    title: string
    slug: string
    price: number
    images?: { url: string }[]
    seller?: { sellerProfile?: { shopName?: string | null } | null } | null
  }
}

const HOUSE = [
  { icon: Crown, title: 'Devenez vendeur Premium', desc: 'Boutique pro, badge vérifié et annonces sponsorisées pour booster vos ventes.', cta: 'Voir les forfaits', href: '/pricing' },
  { icon: ShieldCheck, title: 'Reconditionné LS garanti', desc: '40 points de contrôle, garantie 6 mois incluse. Achetez l’esprit tranquille.', cta: 'Découvrir', href: '/products?isReconditioned=true' },
]

// Cadre pub #1 (emplacement premium du hero). Prend la 1re pub sponsorisée
// active ; repli maison rotatif si aucune. Fetch limit=2 partagé avec la bande
// #2 (même queryKey → 1 seule requête, la bande prend la 2e pub).
export default function HeroAd() {
  const { data } = useQuery({
    queryKey: ['sponsored-featured', 2],
    queryFn: () => api.get('/sponsored-ads/featured', { params: { limit: 2 } }).then((r) => r.data.data as Ad[]),
    staleTime: 5 * 60 * 1000,
  })
  const ad = data && data.length > 0 ? data[0] : null

  const [hi, setHi] = useState(0)
  useEffect(() => {
    if (ad) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setHi((i) => (i + 1) % HOUSE.length), 6000)
    return () => clearInterval(t)
  }, [ad])

  // Impression facturable : tirée une seule fois par pub affichée
  const viewed = useRef<string | null>(null)
  useEffect(() => {
    if (ad && viewed.current !== ad.id) {
      viewed.current = ad.id
      api.post(`/sponsored-ads/${ad.id}/view`).catch(() => {})
    }
  }, [ad])

  if (ad) {
    const p = ad.product
    const shop = p.seller?.sellerProfile?.shopName
    return (
      <Link
        href={`/products/${p.slug}`}
        onClick={() => { api.post(`/sponsored-ads/${ad.id}/click`).catch(() => {}) }}
        className="relative grid grid-cols-2 rounded-2xl overflow-hidden bg-card text-dark shadow-card-hover min-h-[196px]"
      >
        <span className="absolute top-2.5 right-3 z-10 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide text-muted bg-surface/90 px-2 py-0.5 rounded-full">
          <Megaphone size={11} /> Sponsorisé
        </span>
        <div className="relative bg-surface">
          <ProductImage src={p.images?.[0]?.url || '/placeholder.svg'} alt={p.title} fill className="object-cover" sizes="280px" />
        </div>
        <div className="p-5 flex flex-col justify-center min-w-0">
          {shop && <div className="text-[11px] text-muted mb-1 truncate">{shop}</div>}
          <div className="font-extrabold text-[16px] leading-tight line-clamp-2 mb-1">{p.title}</div>
          <div className="text-primary font-extrabold text-[17px] mb-3">{formatPrice(p.price)}</div>
          <span className="inline-flex items-center gap-1.5 w-fit h-10 px-4 rounded-xl bg-accent text-white font-bold text-[13px]">
            Voir l’offre <ArrowRight size={15} />
          </span>
        </div>
      </Link>
    )
  }

  const h = HOUSE[hi]
  const Icon = h.icon
  return (
    <Link
      href={h.href}
      className="relative grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl bg-card text-dark shadow-card-hover p-6 min-h-[196px]"
    >
      <span className="absolute top-2.5 right-3 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide text-muted">
        <Megaphone size={11} /> Espace pub
      </span>
      <div className="w-16 h-16 rounded-2xl bg-accent/12 text-accent grid place-items-center shrink-0"><Icon size={30} /></div>
      <div className="min-w-0">
        <div className="font-extrabold text-[17px] leading-tight mb-1">{h.title}</div>
        <div className="text-[13px] text-muted mb-3">{h.desc}</div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent">{h.cta} <ArrowRight size={15} /></span>
      </div>
    </Link>
  )
}
