'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const plans = [
  {
    name: 'Gratuit',
    price: { monthly: 0, yearly: 0 },
    maxProducts: 10,
    features: ['10 annonces actives', 'Chat interne', 'Avis acheteurs', 'Page profil basique'],
    color: 'border-border',
    textColor: 'text-dark',
    btnClass: 'btn-outline',
  },
  {
    name: 'Basic',
    price: { monthly: 2000, yearly: 20000 },
    maxProducts: 30,
    features: ['30 annonces', 'Statistiques', '1 annonce sponsorisée/mois', 'Commission réduite'],
    color: 'border-primary/30',
    textColor: 'text-primary',
    btnClass: 'btn-outline',
  },
  {
    name: 'Premium',
    price: { monthly: 10000, yearly: 100000 },
    maxProducts: 100,
    features: ['100 annonces', 'Boutique Pro', 'Badge Premium ✓', '10 annonces sponsorisées/mois', 'Stats avancées'],
    color: 'border-primary',
    textColor: 'text-primary',
    btnClass: 'btn-primary',
    popular: true,
  },
  {
    name: 'Pro',
    price: { monthly: 17500, yearly: 175000 },
    maxProducts: 200,
    features: ['200 annonces', 'Badge Pro ✓', 'Annonces illimitées', 'Commission minimale', 'Support prioritaire'],
    color: 'border-accent/50',
    textColor: 'text-accent',
    btnClass: 'btn-accent',
  },
]

export default function PricingSection() {
  const [yearly, setYearly] = useState(false)

  return (
    <section className="section">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="heading-md text-dark mb-2">Forfaits Vendeurs</h2>
          <p className="text-muted mb-6">Choisissez le plan adapté à votre activité</p>

          {/* Toggle billing */}
          <div className="inline-flex items-center gap-3 bg-surface rounded-xl p-1.5 border border-border">
            <button onClick={() => setYearly(false)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', !yearly ? 'bg-white shadow-sm text-dark' : 'text-muted')}>
              Mensuel
            </button>
            <button onClick={() => setYearly(true)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2', yearly ? 'bg-white shadow-sm text-dark' : 'text-muted')}>
              Annuel
              <span className="badge-success text-[10px] px-1.5">-17%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(({ name, price, maxProducts, features, color, textColor, btnClass, popular }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'relative bg-white rounded-2xl p-6 border-2 flex flex-col transition-all duration-300',
                color,
                popular && 'shadow-card-hover -translate-y-2'
              )}
            >
              {popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    <Zap size={11} /> Populaire
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className={`font-display font-bold text-lg mb-1 ${textColor}`}>{name}</div>
                <div className="flex items-baseline gap-1">
                  <span className={`font-display font-black text-3xl ${textColor}`}>
                    {price[yearly ? 'yearly' : 'monthly'] === 0 ? 'Gratuit' : price[yearly ? 'yearly' : 'monthly'].toLocaleString()}
                  </span>
                  {price.monthly > 0 && (
                    <span className="text-muted text-xs">FCFA/{yearly ? 'an' : 'mois'}</span>
                  )}
                </div>
                <div className="text-xs text-muted mt-1">Jusqu'à {maxProducts === 999999 ? '∞' : maxProducts} annonces</div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-dark">
                    <Check size={15} className={`${textColor} shrink-0 mt-0.5`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={price.monthly === 0 ? '/auth/register' : `/pricing?plan=${name.toLowerCase()}`}
                className={cn(btnClass, 'w-full justify-center')}>
                {price.monthly === 0 ? 'Commencer gratuitement' : 'Choisir ce plan'}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-muted text-sm mt-6">
          Passez d'un forfait à l'autre à tout moment. Sans engagement.
        </p>
      </div>
    </section>
  )
}
