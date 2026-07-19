import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageSquare, Phone, ShieldCheck, Banknote, RefreshCw, Truck } from 'lucide-react'

export const metadata: Metadata = {
  title: "Centre d'aide",
  description: 'Questions fréquentes sur LS Marketplace : paiement, séquestre, livraison, remboursement, Mobile Money.',
}

const faqs = [
  { icon: ShieldCheck, q: 'Comment mon paiement est-il protégé ?', a: "Chaque paiement passe par un séquestre (escrow) : votre argent est bloqué et n'est versé au vendeur qu'après votre confirmation de réception. En cas de litige, vous êtes remboursé." },
  { icon: Banknote, q: 'Quels moyens de paiement acceptez-vous ?', a: 'Mobile Money (Wave, Orange Money, MTN MoMo, T-Money, Flooz) et carte bancaire. Pas besoin de compte en banque pour acheter ou vendre.' },
  { icon: Truck, q: 'Comment se passe la livraison ?', a: 'Selon le vendeur : remise en main propre ou expédition. Les modalités et frais sont indiqués sur chaque annonce avant l’achat.' },
  { icon: RefreshCw, q: "Qu'est-ce que « Reconditionné LS » ?", a: 'Des appareils testés et certifiés par nos équipes (40 points de contrôle), garantis 6 mois. Repérables au badge vert « Reconditionné LS ✓ ».' },
  { icon: Banknote, q: 'Comment retirer mes gains en tant que vendeur ?', a: 'Vos ventes créditent votre portefeuille LS. Depuis votre tableau de bord, demandez un retrait par Mobile Money — traité sous 48h ouvrées.' },
  { icon: ShieldCheck, q: 'Un vendeur/acheteur est suspect, que faire ?', a: 'Utilisez le bouton « Signaler » sur l’annonce, ou contactez notre support. Chaque signalement est examiné par notre équipe de modération.' },
]

export default function HelpPage() {
  return (
    <div className="bg-surface min-h-screen">
      <div className="bg-[#12294A] text-white">
        <div className="container-custom py-10 text-center">
          <h1 className="text-3xl font-extrabold mb-2">Centre d&apos;aide</h1>
          <p className="text-[#AFC0D8] max-w-xl mx-auto">Les réponses aux questions les plus fréquentes. Besoin d&apos;aide ? On est là 7j/7.</p>
        </div>
      </div>

      <div className="container-custom py-10">
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {faqs.map(({ icon: Icon, q, a }) => (
            <div key={q} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-accent/12 text-accent flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
                <h3 className="font-bold text-[14px] text-dark">{q}</h3>
              </div>
              <p className="text-[13px] text-muted leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-8 bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-dark mb-1">Vous n&apos;avez pas trouvé votre réponse ?</h3>
            <p className="text-sm text-muted">Notre équipe support vous répond en moins de 24h.</p>
          </div>
          <div className="flex gap-3">
            <a href="https://wa.me/22890009385" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent hover:bg-accent-600 text-white font-bold text-sm transition-colors">
              <Phone size={16} /> WhatsApp
            </a>
            <Link href="/contact" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border text-dark hover:border-primary hover:text-primary font-semibold text-sm transition-colors">
              <MessageSquare size={16} /> Nous écrire
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
