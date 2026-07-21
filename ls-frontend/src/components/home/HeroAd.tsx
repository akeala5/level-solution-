'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Megaphone, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import ProductImage from '@/components/product/ProductImage'
import { useHeroConfig, heroIcon, type HousePromo } from '@/hooks/useHeroConfig'

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

// Repli si la config n'est pas encore chargée (l'API renvoie normalement ces mêmes défauts).
const FALLBACK_HOUSE: HousePromo[] = [
  { icon: 'Crown', title: 'Devenez vendeur Premium', desc: 'Boutique pro, badge vérifié et annonces sponsorisées pour booster vos ventes.', cta: 'Voir les forfaits', href: '/pricing' },
  { icon: 'ShieldCheck', title: 'Reconditionné LS garanti', desc: '40 points de contrôle, garantie 6 mois incluse. Achetez l’esprit tranquille.', cta: 'Découvrir', href: '/products?isReconditioned=true' },
  { icon: 'Store', title: 'Vendez gratuitement', desc: 'Déposez votre annonce en 2 minutes et touchez des milliers d’acheteurs.', cta: 'Déposer une annonce', href: '/products/create' },
  { icon: 'Wallet', title: 'Paiement Mobile Money', desc: 'Transactions sécurisées par séquestre : vous êtes payé, l’acheteur est protégé.', cta: 'Comment ça marche', href: '/how-it-works' },
]

type Card = { kind: 'ad'; ad: Ad } | { kind: 'house'; h: HousePromo }
const PER_PAGE = 2

// Carte pub horizontale (image/icône à gauche, corps à droite) — pleine largeur, hauteur fixe.
function AdCard({ card }: { card: Card }) {
  if (card.kind === 'ad') {
    const p = card.ad.product
    const shop = p.seller?.sellerProfile?.shopName
    return (
      <Link
        href={`/products/${p.slug}`}
        onClick={() => { api.post(`/sponsored-ads/${card.ad.id}/click`).catch(() => {}) }}
        className="group relative flex items-stretch min-h-[96px] rounded-2xl overflow-hidden bg-card text-dark shadow-card-hover"
      >
        <span className="absolute top-2 right-2.5 z-10 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-muted bg-surface/90 px-1.5 py-0.5 rounded-full">
          <Megaphone size={10} /> Sponsorisé
        </span>
        <div className="relative w-28 shrink-0 bg-surface">
          <ProductImage src={p.images?.[0]?.url || '/placeholder.svg'} alt={p.title} fill className="object-cover" sizes="112px" />
        </div>
        <div className="p-3.5 flex flex-col justify-center min-w-0 flex-1">
          {shop && <div className="text-[10.5px] text-muted mb-0.5 truncate">{shop}</div>}
          <div className="font-bold text-[13.5px] leading-tight line-clamp-2 mb-1">{p.title}</div>
          <div className="text-primary font-extrabold text-[15px]">{formatPrice(p.price)}</div>
        </div>
        <span className="self-center pr-3.5 text-accent shrink-0"><ArrowRight size={16} /></span>
      </Link>
    )
  }

  const h = card.h
  const Icon = heroIcon(h.icon)
  return (
    <Link href={h.href} className="group relative flex items-center gap-3.5 min-h-[96px] rounded-2xl bg-card text-dark shadow-card-hover p-4">
      <span className="absolute top-2 right-2.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-muted">
        <Megaphone size={10} /> Espace pub
      </span>
      <div className="w-12 h-12 rounded-xl bg-accent/12 text-accent grid place-items-center shrink-0"><Icon size={24} /></div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-[13.5px] leading-tight mb-0.5">{h.title}</div>
        <div className="text-[11.5px] text-muted line-clamp-2 mb-1.5">{h.desc}</div>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-accent">{h.cta} <ArrowRight size={13} /></span>
      </div>
    </Link>
  )
}

// Cadre pub #1 : 2 slots empilés (1 colonne, pleine largeur) DANS le hero, qui
// DÉFILENT par paires. Fait tourner toutes les pubs sponsorisées actives (2 à la
// fois), complétées par les encarts maison (configurables par l'admin).
export default function HeroAd() {
  const { data: cfg } = useHeroConfig()
  const house = (cfg?.housePromos && cfg.housePromos.length > 0) ? cfg.housePromos : FALLBACK_HOUSE
  const rotateMs = cfg?.rotateMs ?? 6500

  const { data } = useQuery({
    queryKey: ['sponsored-featured', 8],
    queryFn: () => api.get('/sponsored-ads/featured', { params: { limit: 8 } }).then((r) => r.data.data as Ad[]),
    staleTime: 5 * 60 * 1000,
  })
  const ads = data ?? []

  // Pool = pubs réelles puis encarts maison (remplissage) ; toujours ≥ 2 cartes.
  const cards: Card[] = [
    ...ads.map((ad) => ({ kind: 'ad', ad } as Card)),
    ...house.map((h) => ({ kind: 'house', h } as Card)),
  ]
  const pages: Card[][] = Array.from({ length: Math.ceil(cards.length / PER_PAGE) }, (_, i) => cards.slice(i * PER_PAGE, (i + 1) * PER_PAGE))

  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => { if (page >= pages.length) setPage(0) }, [pages.length, page])

  useEffect(() => {
    if (pages.length <= 1 || paused) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setPage((p) => (p + 1) % pages.length), rotateMs)
    return () => clearInterval(timer)
  }, [pages.length, paused, rotateMs])

  // Impressions facturables : une seule fois par pub sponsorisée réellement affichée
  const viewed = useRef<Set<string>>(new Set())
  useEffect(() => {
    for (const c of pages[page] ?? []) {
      if (c.kind === 'ad' && !viewed.current.has(c.ad.id)) {
        viewed.current.add(c.ad.id)
        api.post(`/sponsored-ads/${c.ad.id}/view`).catch(() => {})
      }
    }
  }, [page, pages])

  const current = pages[page] ?? []

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div key={page} className="flex flex-col gap-3 animate-fade-in">
        {current.map((c, i) => <AdCard key={c.kind === 'ad' ? c.ad.id : `h-${page}-${i}`} card={c} />)}
      </div>
      {pages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {pages.map((_, i) => (
            <button key={i} onClick={() => setPage(i)} aria-label={`Page pub ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-4 bg-accent' : 'w-1.5 bg-white/25 hover:bg-white/45'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
