'use client'
import { motion } from 'framer-motion'
import { Shield, Zap, Award, MessageSquare, Truck, Star, TrendingUp, RefreshCw } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Paiement Escrow',
    desc: 'Votre argent est bloqué jusqu\'à réception du produit. Remboursement garanti en cas de litige.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Zap,
    title: 'Mobile Money',
    desc: 'Wave, Orange Money, MTN MoMo, TMoney, Flooz — payez avec ce que vous utilisez déjà.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Award,
    title: 'Vendeurs Certifiés',
    desc: 'Badges KYC vérifiés, historique de ventes public et système de notation transparent.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: MessageSquare,
    title: 'Chat Sécurisé',
    desc: 'Communiquez directement avec les vendeurs. Historique conservé pour protection en cas de litige.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Truck,
    title: 'Livraison Intégrée',
    desc: 'Partenaires locaux pour livrer partout. Suivi en temps réel de votre commande.',
    color: 'bg-cyan-100 text-cyan-600',
  },
  {
    icon: RefreshCw,
    title: 'Reconditionné LS',
    desc: 'Produits certifiés, testés et garantis par LS. Une catégorie de confiance à prix réduit.',
    color: 'bg-accent-100 text-accent',
  },
  {
    icon: TrendingUp,
    title: 'Analytics Vendeurs',
    desc: 'Statistiques détaillées : vues, conversions, revenus. Pilotez votre boutique comme un pro.',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    icon: Star,
    title: 'Programme Fidélité',
    desc: 'Points à chaque achat, niveaux Bronze → Platine, réductions exclusives pour les membres.',
    color: 'bg-yellow-100 text-yellow-600',
  },
]

export default function WhyLSSection() {
  return (
    <section className="section bg-surface">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="badge-accent mb-3">Pourquoi LS ?</span>
          <h2 className="heading-md text-dark mb-3">La marketplace qui vous protège</h2>
          <p className="text-muted max-w-xl mx-auto">
            LS Marketplace combine sécurité des paiements, adaptation aux réalités africaines et outils professionnels pour vendeurs.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-5 border border-border/50 hover:shadow-card transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-dark mb-1.5">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
