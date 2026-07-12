import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import CategoriesSection from '@/components/home/CategoriesSection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import WhyLSSection from '@/components/home/WhyLSSection'
import PricingSection from '@/components/home/PricingSection'
import StatsSection from '@/components/home/StatsSection'
import RecentlyViewedSection from '@/components/home/RecentlyViewedSection'
import type { Metadata } from 'next'

// Cache ISR : page reconstruite côté serveur toutes les 5 minutes max
export const revalidate = 300

export const metadata: Metadata = {
  title: 'LS Marketplace — Achetez & Vendez vos équipements informatiques',
}

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <StatsSection />
      <CategoriesSection />
      <Suspense fallback={<div className="h-96" />}>
        <FeaturedProducts />
      </Suspense>
      <RecentlyViewedSection />
      <WhyLSSection />
      <PricingSection />
    </div>
  )
}
