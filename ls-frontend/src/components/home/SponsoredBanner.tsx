'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Megaphone, ArrowRight } from 'lucide-react'
import { useHeroConfig, heroIcon, type HousePromo } from '@/hooks/useHeroConfig'

const FALLBACK_HOUSE: HousePromo[] = [
  { icon: 'Crown', title: 'Boostez vos ventes', desc: 'Devenez vendeur Premium : boutique pro, badge vérifié et annonces sponsorisées.', cta: 'Voir les forfaits', href: '/pricing' },
  { icon: 'ShieldCheck', title: 'Reconditionné LS garanti', desc: '40 points de contrôle, garantie 6 mois. Achetez l’esprit tranquille.', cta: 'Découvrir', href: '/products?isReconditioned=true' },
  { icon: 'Store', title: 'Vendez gratuitement', desc: 'Déposez votre annonce en 2 minutes et touchez des milliers d’acheteurs.', cta: 'Déposer une annonce', href: '/products/create' },
  { icon: 'Wallet', title: 'Paiement Mobile Money sécurisé', desc: 'Séquestre : vous êtes payé, l’acheteur est protégé jusqu’à réception.', cta: 'Comment ça marche', href: '/how-it-works' },
]

// Cadre pub #2 (bande) : encart maison rotatif (cross-sell), découplé du hero.
// Encarts issus de la config admin (hero_config.housePromos) ou repli local.
export default function SponsoredBanner() {
  const { data: cfg } = useHeroConfig()
  const house = (cfg?.housePromos && cfg.housePromos.length > 0) ? cfg.housePromos : FALLBACK_HOUSE

  // Démarre sur un encart différent du hero (qui affiche les 1ers) pour éviter la redite.
  const [hi, setHi] = useState(0)
  useEffect(() => {
    setHi(house.length > 2 ? 2 : 0)
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setHi((i) => (i + 1) % house.length), 6000)
    return () => clearInterval(t)
  }, [house.length])

  const h = house[Math.min(hi, house.length - 1)]
  if (!h) return null
  const Icon = heroIcon(h.icon)

  return (
    <section className="container-custom mt-10">
      <Link key={hi} href={h.href} className="relative flex items-center gap-4 bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow animate-fade-in">
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
