'use client'
import { ShieldCheck, Smartphone, BadgeCheck, RefreshCw } from 'lucide-react'

const pillars = [
  {
    icon: ShieldCheck,
    title: 'Paiement sous séquestre',
    desc: "Votre argent est bloqué et protégé jusqu'à la réception conforme de votre commande. Remboursé en cas de problème.",
  },
  {
    icon: Smartphone,
    title: 'Mobile Money natif',
    desc: 'Payez et encaissez avec Wave, Orange Money, MTN MoMo, T-Money, Flooz — sans carte bancaire.',
  },
  {
    icon: BadgeCheck,
    title: 'Vendeurs vérifiés (KYC)',
    desc: "Identité vérifiée, avis authentiques, historique public : vous savez toujours à qui vous achetez.",
  },
  {
    icon: RefreshCw,
    title: 'Reconditionné LS garanti',
    desc: '40 points de contrôle, testé et certifié par nos équipes, avec garantie 6 mois incluse.',
  },
]

export default function WhyLSSection() {
  return (
    <section className="section bg-card pt-16 pb-20">
      <div className="container-custom">
        <div className="text-center mb-9">
          <span className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
            <ShieldCheck size={13} /> Pourquoi LS Marketplace
          </span>
          <h2 className="heading-md text-dark mb-2">Acheter et vendre, en toute confiance</h2>
          <p className="text-muted max-w-xl mx-auto">Quatre garanties concrètes, pensées pour l&apos;Afrique de l&apos;Ouest.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface border border-border rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center mb-4">
                <Icon size={22} />
              </div>
              <h3 className="font-bold text-[15px] text-dark mb-1.5">{title}</h3>
              <p className="text-[13px] text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
