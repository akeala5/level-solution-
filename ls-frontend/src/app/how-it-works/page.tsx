import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, ShieldCheck, Package, Star, Plus, Camera, MessageSquare, Banknote } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Comment ça marche',
  description: 'Acheter et vendre sur LS Marketplace en toute sécurité : paiement sous séquestre, Mobile Money, livraison.',
}

const buyer = [
  { icon: Search, title: 'Trouvez', desc: "Parcourez des milliers d'annonces vérifiées ou recherchez précisément ce que vous voulez." },
  { icon: ShieldCheck, title: 'Payez en sécurité', desc: 'Réglez par Mobile Money. Votre argent est bloqué sous séquestre (escrow) — le vendeur n’est payé qu’après votre confirmation.' },
  { icon: Package, title: 'Recevez', desc: 'Le vendeur expédie ou vous remet le produit. Vous vérifiez qu’il est conforme.' },
  { icon: Star, title: 'Confirmez & notez', desc: 'Vous validez la réception : le paiement est libéré. Un souci ? Ouvrez un litige, vous êtes remboursé.' },
]

const seller = [
  { icon: Plus, title: 'Créez votre compte', desc: 'Inscription gratuite. Vérification KYC pour gagner la confiance des acheteurs.' },
  { icon: Camera, title: 'Publiez votre annonce', desc: 'Photos, prix, état — en quelques minutes. 10 annonces gratuites, plus avec un forfait.' },
  { icon: MessageSquare, title: 'Échangez', desc: 'Répondez aux acheteurs via le chat interne. Négociez, rassurez, concluez.' },
  { icon: Banknote, title: 'Encaissez', desc: 'À la confirmation de l’acheteur, votre solde est crédité. Retirez par Mobile Money.' },
]

function Steps({ title, steps }: { title: string; steps: typeof buyer }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-dark mb-5">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {steps.map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
                <Icon size={20} />
              </div>
              <span className="text-xs font-bold text-muted">Étape {i + 1}</span>
            </div>
            <h3 className="font-bold text-[15px] text-dark mb-1">{title}</h3>
            <p className="text-[13px] text-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HowItWorksPage() {
  return (
    <div className="bg-surface min-h-screen">
      <div className="bg-[#12294A] text-white">
        <div className="container-custom py-10 text-center">
          <h1 className="text-3xl font-extrabold mb-2">Comment ça marche</h1>
          <p className="text-[#AFC0D8] max-w-xl mx-auto">Acheter et vendre en toute sécurité, avec paiement sous séquestre et Mobile Money.</p>
        </div>
      </div>
      <div className="container-custom py-10 space-y-12">
        <Steps title="Pour les acheteurs" steps={buyer} />
        <Steps title="Pour les vendeurs" steps={seller} />
        <div className="text-center pt-2">
          <Link href="/products" className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-accent hover:bg-accent-600 text-white font-bold text-sm transition-colors">
            Explorer les annonces
          </Link>
        </div>
      </div>
    </div>
  )
}
