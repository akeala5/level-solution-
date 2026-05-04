import HeroSection from '@/components/home/HeroSection'
import CategoriesSection from '@/components/home/CategoriesSection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import WhyLSSection from '@/components/home/WhyLSSection'
import PricingSection from '@/components/home/PricingSection'
import StatsSection from '@/components/home/StatsSection'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LS Marketplace — Achetez & Vendez vos équipements informatiques',
}

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <StatsSection />
      <CategoriesSection />
      <FeaturedProducts />
      <WhyLSSection />
      <PricingSection />
    </div>
  )
}
