import type { Metadata } from 'next'
import { Phone, Mail, MessageSquare, MapPin, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contacter le support',
  description: 'Contactez l’équipe LS Marketplace par WhatsApp, e-mail ou chat. Support 7j/7, réponse sous 24h.',
}

const channels = [
  { icon: Phone, title: 'WhatsApp', value: '+228 90 00 93 85', href: 'https://wa.me/22890009385', note: 'Le plus rapide — réponse en journée' },
  { icon: Phone, title: 'WhatsApp (2)', value: '+228 99 99 88 38', href: 'https://wa.me/22899998838', note: 'Ligne support secondaire' },
  { icon: Mail, title: 'E-mail', value: 'support@lsgrouptogo.com', href: 'mailto:support@lsgrouptogo.com', note: 'Pour les demandes détaillées' },
  { icon: MessageSquare, title: 'Chat interne', value: 'Ouvrir le chat', href: '/chat', note: 'Depuis votre compte connecté' },
]

export default function ContactPage() {
  return (
    <div className="bg-surface min-h-screen">
      <div className="bg-[#12294A] text-white">
        <div className="container-custom py-10 text-center">
          <h1 className="text-3xl font-extrabold mb-2">Contacter le support</h1>
          <p className="text-[#AFC0D8] max-w-xl mx-auto">Une question, un souci sur une commande ? On vous répond 7j/7.</p>
        </div>
      </div>

      <div className="container-custom py-10">
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {channels.map(({ icon: Icon, title, value, href, note }) => (
            <a key={title} href={href} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:border-primary transition-colors group">
              <div className="w-11 h-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-muted uppercase tracking-wide">{title}</div>
                <div className="font-bold text-dark group-hover:text-primary transition-colors truncate">{value}</div>
                <div className="text-[12px] text-muted mt-0.5">{note}</div>
              </div>
            </a>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-6 grid sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
            <Clock size={20} className="text-accent shrink-0" />
            <div><div className="font-semibold text-sm text-dark">Horaires</div><div className="text-[13px] text-muted">Lun–Sam, 8h–20h (GMT)</div></div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
            <MapPin size={20} className="text-accent shrink-0" />
            <div><div className="font-semibold text-sm text-dark">Adresse</div><div className="text-[13px] text-muted">Lomé, Togo</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}
