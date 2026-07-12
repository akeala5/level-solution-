'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Truck, Star, Shield, Zap, Crown, CheckCircle,
  ShoppingBag, Bell, Gift, ArrowRight
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

const BENEFITS = [
  {
    icon: Truck,
    color: 'bg-indigo-50 text-indigo-600',
    title: 'Livraison offerte',
    desc: 'Frais de livraison à 0 FCFA sur toutes vos commandes, quelle que soit la distance.',
  },
  {
    icon: Star,
    color: 'bg-amber-50 text-amber-600',
    title: 'Accès aux deals exclusifs',
    desc: 'Découvrez des offres flash et promotions réservées aux membres Premium.',
  },
  {
    icon: Shield,
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Protection acheteur renforcée',
    desc: 'Remboursement prioritaire et accès à un support dédié 24h/7j.',
  },
  {
    icon: Bell,
    color: 'bg-rose-50 text-rose-600',
    title: 'Alertes en avant-première',
    desc: 'Soyez notifié avant tout le monde dès qu\'un produit de votre liste de souhaits est disponible.',
  },
  {
    icon: Zap,
    color: 'bg-violet-50 text-violet-600',
    title: 'Prix négociés',
    desc: 'Accédez aux meilleures offres négociées directement avec les vendeurs certifiés.',
  },
  {
    icon: Gift,
    color: 'bg-pink-50 text-pink-600',
    title: 'Points fidélité doublés',
    desc: 'Cumulez 2× plus de points sur chaque achat et montez plus vite dans les paliers.',
  },
]

const PLANS = [
  {
    name: 'Premium Mensuel',
    price: 1500,
    period: 'mois',
    highlight: false,
    cta: 'Souscrire maintenant',
  },
  {
    name: 'Premium Annuel',
    price: 14000,
    period: 'an',
    highlight: true,
    badge: 'Économisez 22%',
    cta: 'Meilleure offre',
  },
]

export default function PremiumPage() {
  const { user, isAuthenticated } = useAuthStore()
  const isPremium = user?.subscription?.plan !== 'FREE' && user?.subscription?.plan !== undefined

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-slate-900">

      {/* Hero */}
      <div className="container-custom pt-16 pb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 text-xs font-bold px-4 py-1.5 rounded-full border border-amber-400/30 mb-6">
            <Crown size={14} />
            LS Marketplace Premium Acheteur
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Achetez mieux.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Dépensez moins.
            </span>
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mx-auto">
            Livraison offerte, deals exclusifs et protection renforcée sur tous vos achats.
          </p>
        </motion.div>
      </div>

      {/* Benefits grid */}
      <div className="container-custom pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${b.color}`}>
                <b.icon size={20} />
              </div>
              <h3 className="text-white font-bold text-sm mb-1">{b.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Pricing */}
        {isPremium ? (
          <div className="max-w-md mx-auto bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 text-center">
            <CheckCircle size={40} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">Vous êtes déjà membre Premium !</h2>
            <p className="text-slate-300 text-sm mb-6">
              Profitez de la livraison offerte et de tous vos avantages sur chaque commande.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              <ShoppingBag size={16} />
              Explorer les produits
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white text-center mb-8">Choisissez votre plan</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl p-6 border transition-all ${
                    plan.highlight
                      ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-900'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-white font-bold mb-3">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-black text-white">{plan.price.toLocaleString('fr-FR')}</span>
                    <span className="text-slate-300 text-sm ml-1">FCFA/{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {['Livraison offerte', 'Deals exclusifs', 'Support prioritaire', 'Points ×2'].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-200">
                        <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {isAuthenticated ? (
                    <Link
                      href="/subscriptions"
                      className={`flex items-center justify-center gap-2 w-full font-bold text-sm py-2.5 rounded-xl transition-colors ${
                        plan.highlight
                          ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      {plan.cta} <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <Link
                      href="/auth/login?redirect=/premium"
                      className={`flex items-center justify-center gap-2 w-full font-bold text-sm py-2.5 rounded-xl transition-colors ${
                        plan.highlight
                          ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      Se connecter pour souscrire <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-slate-500 text-xs mt-6">
              Résiliation possible à tout moment · Paiement Mobile Money ou Stripe
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
