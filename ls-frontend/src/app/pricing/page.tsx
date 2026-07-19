import type { Metadata } from 'next'
import PricingSection from '@/components/home/PricingSection'

export const metadata: Metadata = {
  title: 'Forfaits & Tarifs vendeur',
  description: 'Choisissez le forfait vendeur adapté à votre activité sur LS Marketplace. Commencez gratuitement.',
}

export default function PricingPage() {
  return (
    <div className="bg-surface min-h-screen">
      <PricingSection />
    </div>
  )
}
