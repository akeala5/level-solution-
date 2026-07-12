'use client'
import { motion } from 'framer-motion'
import { Shield, Zap, Award, MessageSquare, Truck, Star, TrendingUp, RefreshCw, CheckCircle, Globe } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Paiement Escrow',
    desc: 'Votre argent est bloqué jusqu\'à réception. Remboursement garanti en cas de litige.',
    accent: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
  {
    icon: Zap,
    title: 'Mobile Money',
    desc: 'Wave, Orange Money, MTN MoMo, TMoney, Flooz — payez comme vous le faites déjà.',
    accent: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    tags: ['Wave', 'T-Money', 'MTN'],
  },
  {
    icon: Award,
    title: 'Vendeurs Certifiés',
    desc: 'Badges KYC vérifiés, historique public et système de notation transparent.',
    accent: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
  {
    icon: MessageSquare,
    title: 'Chat Sécurisé',
    desc: 'Communiquez avec les vendeurs. Historique conservé pour protection en cas de litige.',
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: Truck,
    title: 'Livraison Intégrée',
    desc: 'Partenaires locaux pour livrer partout. Suivi en temps réel de votre commande.',
    accent: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
  },
  {
    icon: RefreshCw,
    title: 'Reconditionné LS',
    desc: 'Produits certifiés, testés et garantis par LS. Confiance à prix réduit.',
    accent: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },
  {
    icon: TrendingUp,
    title: 'Analytics Vendeurs',
    desc: 'Vues, conversions, revenus — pilotez votre boutique avec des données précises.',
    accent: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    icon: Star,
    title: 'Programme Fidélité',
    desc: 'Points à chaque achat, niveaux Bronze → Platine, réductions exclusives membres.',
    accent: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-100',
  },
]

const trustBadges = [
  { label: '100 % Sécurisé', icon: Shield, color: 'text-indigo-500' },
  { label: 'KYC Vérifié', icon: CheckCircle, color: 'text-emerald-500' },
  { label: 'Support 7j/7', icon: Award, color: 'text-amber-500' },
  { label: 'Multi-pays', icon: Globe, color: 'text-cyan-500' },
]

export default function WhyLSSection() {
  return (
    <section className="section bg-slate-50">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          {/* Section badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4 shadow-sm">
            <Shield size={12} />
            Pourquoi LS ?
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 leading-tight">
            La marketplace qui vous protège
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm leading-relaxed">
            LS Marketplace combine sécurité des paiements, adaptation aux réalités africaines
            et outils professionnels pour vendeurs.
          </p>

          {/* Trust badges row */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {trustBadges.map(({ label, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
              >
                <Icon size={11} className={color} />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Feature cards — 4 cols desktop */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map(({ icon: Icon, title, desc, accent, bg, border, tags }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}
              className={`bg-white rounded-xl p-4 border ${border} transition-all duration-200 cursor-default`}
            >
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={15} className={accent} />
              </div>
              <h3 className="font-semibold text-sm text-slate-800 mb-1 leading-snug">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>

              {tags && (
                <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
