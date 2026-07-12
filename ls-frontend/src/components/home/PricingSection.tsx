'use client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const plans = [
  {
    name: 'Gratuit',
    price: { monthly: 0, yearly: 0 },
    maxProducts: 10,
    included: ['10 annonces actives', 'Chat interne', 'Avis acheteurs', 'Page profil basique'],
    missing: ['Statistiques', 'Boutique Pro', 'Annonces sponsorisées', 'Commission réduite'],
    accent: 'text-slate-700',
    border: 'border-slate-200',
    btn: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
    badgeBg: '',
  },
  {
    name: 'Basic',
    price: { monthly: 2000, yearly: 20000 },
    maxProducts: 30,
    included: ['30 annonces actives', 'Statistiques', '1 annonce sponsorisée/mois', 'Commission réduite'],
    missing: ['Boutique Pro', 'Annonces illimitées'],
    accent: 'text-indigo-600',
    border: 'border-indigo-200',
    btn: 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50',
    badgeBg: '',
  },
  {
    name: 'Premium',
    price: { monthly: 10000, yearly: 100000 },
    maxProducts: 100,
    included: ['100 annonces actives', 'Boutique Pro', 'Badge Premium ✓', '10 annonces sponsorisées/mois', 'Stats avancées'],
    missing: [],
    accent: 'text-white',
    border: 'border-indigo-600',
    btn: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200',
    popular: true,
    badgeBg: 'bg-indigo-600',
  },
  {
    name: 'Pro',
    price: { monthly: 17500, yearly: 175000 },
    maxProducts: 200,
    included: ['200 annonces actives', 'Badge Pro ✓', 'Annonces illimitées', 'Commission minimale', 'Support prioritaire'],
    missing: [],
    accent: 'text-amber-600',
    border: 'border-amber-200',
    btn: 'border border-amber-300 text-amber-700 hover:bg-amber-50',
    badgeBg: '',
  },
]

export default function PricingSection() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className="section bg-white">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4 shadow-sm">
            <Sparkles size={12} />
            Vendeurs
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Forfaits &amp; Tarifs
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Commencez gratuitement — passez au niveau supérieur quand vous êtes prêt
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setYearly(false)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', !yearly ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              Mensuel
            </button>
            <button
              onClick={() => setYearly(true)}
              className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all', yearly ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              Annuel
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">-17%</span>
            </button>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {plans.map(({ name, price, maxProducts, included, missing, accent, border, btn, popular }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                'relative bg-white rounded-2xl border-2 p-5 flex flex-col transition-all duration-300',
                border,
                popular && 'ring-2 ring-indigo-300 ring-offset-2 shadow-lg shadow-indigo-100 -translate-y-1'
              )}
            >
              {popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                    <Zap size={10} /> Populaire
                  </span>
                </div>
              )}

              {/* Plan name + price */}
              <div className="mb-4">
                <p className={cn('text-xs uppercase tracking-widest font-semibold mb-2', popular ? 'text-indigo-500' : 'text-slate-400')}>
                  {name}
                </p>
                <div className="flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={yearly ? 'y' : 'm'}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18 }}
                      className="text-2xl font-bold text-slate-900"
                    >
                      {price[yearly ? 'yearly' : 'monthly'] === 0
                        ? 'Gratuit'
                        : price[yearly ? 'yearly' : 'monthly'].toLocaleString()}
                    </motion.span>
                  </AnimatePresence>
                  {price.monthly > 0 && (
                    <span className="text-xs text-slate-400">FCFA/{yearly ? 'an' : 'mois'}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Jusqu'à {maxProducts} annonces
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-5">
                {included.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check size={13} className={cn('shrink-0 mt-0.5', popular ? 'text-indigo-500' : 'text-emerald-500')} />
                    {f}
                  </li>
                ))}
                {missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                    <X size={13} className="text-slate-300 shrink-0 mt-0.5" />
                    <span className="line-through">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={price.monthly === 0 ? '/auth/register' : `/pricing?plan=${name.toLowerCase()}`}
                className={cn('w-full text-center text-sm font-semibold py-2 rounded-xl transition-all', btn)}
              >
                {price.monthly === 0 ? 'Commencer gratuitement' : 'Choisir ce plan'}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Passez d'un forfait à l'autre à tout moment · Sans engagement · Annulation en 1 clic
        </p>
      </div>
    </section>
  )
}
