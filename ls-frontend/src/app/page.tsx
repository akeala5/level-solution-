import { Suspense } from 'react'
import Link from 'next/link'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getServerQueryClient } from '@/lib/get-query-client'
import { serverGet } from '@/lib/server-fetch'
import HeroSection from '@/components/home/HeroSection'
import NowShowcase from '@/components/home/NowShowcase'
import SponsoredBanner from '@/components/home/SponsoredBanner'
import CategoriesSection from '@/components/home/CategoriesSection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import WhyLSSection from '@/components/home/WhyLSSection'
import StatsSection from '@/components/home/StatsSection'
import RecentlyViewedSection from '@/components/home/RecentlyViewedSection'
import type { Metadata } from 'next'

// Cache ISR : page reconstruite côté serveur toutes les 5 minutes max
export const revalidate = 300

export const metadata: Metadata = {
  title: 'LS Marketplace — Achetez & Vendez en toute sécurité',
}

function ReconBand() {
  return (
    <section className="container-custom mt-6">
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5 flex items-center gap-4 shadow-card">
        <div className="w-11 h-11 rounded-xl bg-accent/[0.13] text-accent grid place-items-center shrink-0">
          <ShieldCheck size={22} />
        </div>
        <div className="min-w-0">
          <h3 className="font-extrabold text-[15px] text-dark">Reconditionné LS ✓ — certifié, testé, garanti</h3>
          <p className="text-[13px] text-muted">Nos appareils reconditionnés passent 40 points de contrôle. Garantie 6 mois incluse.</p>
        </div>
        <Link href="/products?isReconditioned=true" className="ml-auto text-[13px] font-bold text-accent flex items-center gap-1.5 whitespace-nowrap">
          Découvrir <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}

export default async function HomePage() {
  // Prefetch serveur des données PUBLIQUES de la home, avec les MÊMES queryKey
  // que les composants clients → hydratation : aucun fetch client au 1er rendu.
  // allSettled : une API en panne au build ne casse pas la page (le composant
  // concerné retombera sur son fetch client).
  const queryClient = getServerQueryClient()
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ['home-categories'],
      queryFn: () => serverGet('/categories'),
    }),
    queryClient.prefetchQuery({
      queryKey: ['hero-hot'],
      queryFn: () => serverGet('/products?sortBy=popular&limit=12'),
    }),
    queryClient.prefetchQuery({
      queryKey: ['featured-products', 'newest'],
      queryFn: () => serverGet('/products?sortBy=newest&limit=8'),
    }),
    queryClient.prefetchQuery({
      queryKey: ['platform-stats'],
      queryFn: () => serverGet('/stats'),
    }),
    queryClient.prefetchQuery({
      queryKey: ['sponsored-featured', 8],
      queryFn: () => serverGet('/sponsored-ads/featured?limit=8'),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div>
        <HeroSection />
        <NowShowcase />
        <CategoriesSection />
        <SponsoredBanner />
        <ReconBand />
        <Suspense fallback={<div className="h-96" />}>
          <FeaturedProducts />
        </Suspense>
        <RecentlyViewedSection />
        <StatsSection />
        <WhyLSSection />
      </div>
    </HydrationBoundary>
  )
}
