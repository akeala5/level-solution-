'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Laptop, Cpu, Wifi, Monitor, Package, Smartphone, Shield, Tag, HardDrive, Headphones } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// Icône par slug de catégorie (fallback Package). Les catégories elles-mêmes
// viennent de l'API — on n'affiche que celles qui existent réellement.
const ICONS: Record<string, typeof Laptop> = {
  ordinateurs: Laptop,
  composants: Cpu,
  'reseau-serveurs': Wifi,
  peripheriques: Monitor,
  accessoires: Headphones,
  'mobiles-tablettes': Smartphone,
  'logiciels-licences': Tag,
  'reconditionne-ls': Shield,
  stockage: HardDrive,
}

interface ApiCategory {
  id: string
  name: string
  slug: string
  _count?: { products: number }
}

export default function CategoriesSection() {
  const { data } = useQuery({
    queryKey: ['home-categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data as ApiCategory[]),
    staleTime: 10 * 60 * 1000,
  })

  const cats = (data ?? []).slice(0, 8)

  return (
    <section className="section bg-surface">
      <div className="container-custom">
        <div className="text-center mb-8">
          <h2 className="heading-md text-dark mb-2">Parcourir par catégorie</h2>
          <p className="text-muted">Trouvez exactement ce que vous cherchez</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {cats.map((cat) => {
            const Icon = ICONS[cat.slug] || Package
            const count = cat._count?.products ?? 0
            const featured = cat.slug === 'reconditionne-ls'
            return (
              <Link
                key={cat.id}
                href={`/products?categorySlug=${cat.slug}`}
                className={cn(
                  'group relative flex flex-col items-center p-4 md:p-5 rounded-2xl border bg-card transition-colors',
                  featured ? 'border-accent/40' : 'border-border hover:border-primary/50'
                )}
              >
                {featured && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    Certifié LS
                  </span>
                )}
                <div className={cn(
                  'w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-3',
                  featured ? 'bg-accent/12' : 'bg-surface'
                )}>
                  <Icon size={24} className={featured ? 'text-accent' : 'text-muted group-hover:text-primary transition-colors'} />
                </div>
                <span className="text-sm font-semibold text-dark text-center leading-snug group-hover:text-primary transition-colors">
                  {cat.name}
                </span>
                {count > 0 && (
                  <span className="text-xs text-muted mt-1">{count.toLocaleString('fr-FR')} annonce{count > 1 ? 's' : ''}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
