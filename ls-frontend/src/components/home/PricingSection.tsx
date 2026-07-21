'use client'
import Link from 'next/link'
import { Check, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// Forfaits chargés depuis l'API (source unique : table subscription_plan_configs,
// éditable par l'admin). Fini les prix codés en dur qui divergeaient du back.
interface PlanConfig {
  plan: string
  name: string
  maxProducts: number
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  isActive: boolean
}

export default function PricingSection() {
  const [yearly, setYearly] = useState(false)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => api.get('/subscriptions/plans').then((r) => r.data.data as PlanConfig[]),
    staleTime: 10 * 60 * 1000,
  })

  return (
    <section id="pricing" className="section bg-surface">
      <div className="container-custom">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles size={12} /> Espace vendeurs
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-dark mb-2">Forfaits &amp; Tarifs</h2>
          <p className="text-muted text-sm mb-6">Commencez gratuitement — passez au niveau supérieur quand vous êtes prêt.</p>

          <div className="inline-flex items-center bg-card border border-border rounded-xl p-1 gap-1">
            <button onClick={() => setYearly(false)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', !yearly ? 'bg-primary text-white' : 'text-muted hover:text-dark')}>
              Mensuel
            </button>
            <button onClick={() => setYearly(true)}
              className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', yearly ? 'bg-primary text-white' : 'text-muted hover:text-dark')}>
              Annuel
              <span className="text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-bold">-17%</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse h-72" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {(plans ?? []).map((p) => {
              const popular = p.plan === 'PREMIUM'
              const price = yearly ? p.yearlyPrice : p.monthlyPrice
              return (
                <div
                  key={p.plan}
                  id={p.plan === 'PRO' ? 'pro' : undefined}
                  className={cn(
                    'relative bg-card rounded-2xl border p-5 flex flex-col scroll-mt-24',
                    popular ? 'border-accent shadow-card-hover' : 'border-border'
                  )}
                >
                  {popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-full">
                        <Zap size={10} /> Populaire
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className={cn('text-xs uppercase tracking-widest font-semibold mb-2', popular ? 'text-accent' : 'text-muted')}>{p.name}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-dark">
                        {price === 0 ? 'Gratuit' : price.toLocaleString('fr-FR')}
                      </span>
                      {p.monthlyPrice > 0 && <span className="text-xs text-muted">FCFA/{yearly ? 'an' : 'mois'}</span>}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {p.maxProducts >= 999999 ? 'Annonces illimitées' : `Jusqu'à ${p.maxProducts} annonces`}
                    </p>
                  </div>

                  <ul className="space-y-2 flex-1 mb-5">
                    {(p.features ?? []).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-dark">
                        <Check size={13} className="shrink-0 mt-0.5 text-accent" /> {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={p.monthlyPrice === 0 ? '/auth/register' : '/dashboard'}
                    className={cn('w-full text-center text-sm font-semibold py-2.5 rounded-xl transition-colors',
                      popular ? 'bg-accent text-white hover:bg-accent-600' : 'border border-border text-dark hover:border-primary hover:text-primary')}
                  >
                    {p.monthlyPrice === 0 ? 'Commencer gratuitement' : 'Choisir ce plan'}
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-muted text-xs mt-6">
          Passez d&apos;un forfait à l&apos;autre à tout moment · Sans engagement · Annulation en 1 clic
        </p>
      </div>
    </section>
  )
}
