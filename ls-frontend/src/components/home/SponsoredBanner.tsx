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
  { icon: Crown, title: 'Boostez vos ventes', desc: 'Devenez vendeur Premium : boutique pro, badge vérifié et annonces sponsorisées.', cta: 'Voir les forfaits', href: '/pricing' },
  { icon: ShieldCheck, title: 'Reconditionné LS garanti', desc: '40 points de contrôle, garantie 6 mois. Achetez l’esprit tranquille.', cta: 'Découvrir', href: '/products?isReconditioned=true' },
]

// Cadre pub #2 (bande). Partage le fetch limit=2 du hero (même queryKey → 1
// requête) et affiche la 2e pub sponsorisée si elle existe, sinon repli maison.
// Ainsi le hero (#1) et la bande (#2) ne montrent jamais le même produit.
export default function SponsoredBanner() {
  const { data } = useQuery({
    queryKey: ['sponsored-featured', 2],
    queryFn: () => api.get('/sponsored-ads/featured', { params: { limit: 2 } }).then((r) => r.data.data as Ad[]),
    staleTime: 5 * 60 * 1000,
  })
  const ad = data && data.length > 1 ? data[1] : null

  // Rotation du repli maison (si aucune 2e pub active)
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
      <section className="container-custom mt-10">
        <Link
          href={`/products/${p.slug}`}
          onClick={() => { api.post(`/sponsored-ads/${ad.id}/click`).catch(() => {}) }}
          className="relative flex items-center gap-4 bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow"
        >
          <span className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-wide text-muted flex items-center gap-1">
            <Megaphone size={11} /> Sponsorisé
          </span>
          <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-surface shrink-0">
            <ProductImage src={p.images?.[0]?.url || '/placeholder.svg'} alt={p.title} fill className="object-cover" sizes="96px" />
          </div>
          <div className="min-w-0 flex-1">
            {shop && <div className="text-[11px] text-muted mb-0.5 truncate">{shop}</div>}
            <div className="font-bold text-dark text-[15px] leading-tight line-clamp-1">{p.title}</div>
            <div className="text-primary font-extrabold mt-0.5">{formatPrice(p.price)}</div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-accent text-white font-bold text-sm shrink-0">
            Voir <ArrowRight size={15} />
          </span>
        </Link>
      </section>
    )
  }

  const h = HOUSE[hi]
  const Icon = h.icon
  return (
    <section className="container-custom mt-10">
      <Link href={h.href} className="relative flex items-center gap-4 bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow">
        <span className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-wide text-muted flex items-center gap-1">
          <Megaphone size={11} /> Espace pub
        </span>
        <div className="w-14 h-14 rounded-xl bg-accent/12 text-accent grid place-items-center shrink-0"><Icon size={26} /></div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-dark text-[15px] leading-tight">{h.title}</div>
          <div className="text-[13px] text-muted line-clamp-1">{h.desc}</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent shrink-0 whitespace-nowrap">
          {h.cta} <ArrowRight size={15} />
        </span>
      </Link>
    </section>
  )
}
