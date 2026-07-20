'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, Zap, Award, Plus, LayoutGrid, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import HeroAd from '@/components/home/HeroAd'

const TRENDING = ['RTX 4080', 'MacBook Pro', 'iPhone recondit.', 'Switch réseau', 'Écran 4K']

export default function HeroSection() {
  const router = useRouter()
  const t = useTranslations('hero')

  return (
    <section className="relative overflow-hidden bg-[#12294A] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: 'radial-gradient(900px 300px at 80% -30%, rgba(39,174,96,.15), transparent 60%)' }}
      />

      <div className="container-custom relative z-10 py-8 lg:py-9">
        <div className="grid lg:grid-cols-[1.25fr_.95fr] gap-8 lg:gap-10 items-center">

          {/* Gauche : accroche + CTA + confiance + tendances */}
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#CFE9DB] bg-accent/15 border border-accent/30 px-3 py-1.5 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" /> {t('badge')}
            </span>

            <h1 className="text-3xl lg:text-[34px] font-extrabold leading-[1.1] tracking-tight mb-2.5 text-white">
              {t('title_part1')} <span className="text-accent">{t('title_highlight')}</span> {t('title_part2')}
            </h1>

            <p className="text-[#AFC0D8] text-[14.5px] leading-relaxed mb-4 max-w-[48ch]">{t('subtitle')}</p>

            <div className="flex flex-wrap gap-3 mb-4">
              <Link href="/products" className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-accent hover:bg-accent-600 text-white font-bold text-[14.5px] transition-colors">
                <LayoutGrid size={18} /> {t('cta_browse')}
              </Link>
              <Link href="/products/create" className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.16] font-semibold text-[14.5px] transition-colors">
                <Plus size={17} /> {t('cta_sell')}
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {[{ icon: Shield, text: t('trust_escrow') }, { icon: Zap, text: t('trust_mobile') }, { icon: Award, text: t('trust_verified') }].map(({ icon: Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#DCE6F3] bg-white/[0.06] border border-white/[0.12] px-3 py-1.5 rounded-full">
                  <Icon size={15} className="text-accent" /> {text}
                </span>
              ))}
            </div>

            <div className="flex items-center flex-wrap gap-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 text-white/50"><TrendingUp size={14} /> {t('trending')}</span>
              {TRENDING.map((term) => (
                <button key={term} onClick={() => router.push(`/products?search=${encodeURIComponent(term)}`)}
                  className="text-[#CBD8EC] bg-white/[0.06] hover:bg-white/[0.13] hover:text-white border border-white/[0.10] px-3 py-1 rounded-full transition-colors">{term}</button>
              ))}
            </div>
          </div>

          {/* Droite : cadre pub #1 premium (sponsorisé réel ou repli maison) */}
          <div className="hidden lg:block animate-fade-in">
            <HeroAd />
          </div>
        </div>
      </div>
    </section>
  )
}
