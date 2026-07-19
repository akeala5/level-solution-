'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, Shield, Zap, Award, Send } from 'lucide-react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) { setSubscribed(true); setEmail('') }
  }

  return (
    <footer className="bg-[#12294A] text-white">
      {/* Trust bar */}
      <div className="border-b border-white/10">
        <div className="container-custom py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Paiement sécurisé', desc: 'Escrow LS protège chaque transaction' },
              { icon: Zap,    title: 'Mobile Money',      desc: 'Wave · T-Money · Flooz · MTN' },
              { icon: Award,  title: 'Vendeurs vérifiés', desc: 'KYC et badges de confiance' },
              { icon: Mail,   title: 'Support 7j/7',      desc: 'Réponse en moins de 24h' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-xs text-white/60 mt-0.5">{desc}</div>
                  {title === 'Mobile Money' && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {['Wave', 'T-Money', 'Flooz', 'MTN', 'Orange'].map((m) => (
                        <span key={m} className="text-[9px] font-bold bg-white/10 text-white/70 px-1.5 py-0.5 rounded-full border border-white/10">{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                <span className="text-white font-black font-display text-xl">L</span>
              </div>
              <div>
                <div className="font-display font-black text-xl leading-none">LS</div>
                <div className="text-[10px] text-white/50 tracking-widest uppercase">Level Solution IT</div>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              La marketplace de référence pour les équipements informatiques en Afrique francophone. Achetez et vendez en toute confiance.
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" aria-label="Réseau social" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-accent/20 hover:text-accent transition-colors">
                  <Icon size={16} />
                </a>
              ))}
            </div>

            {/* Newsletter */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-white/80 mb-2">Recevoir les meilleures offres</p>
              {subscribed ? (
                <p className="text-xs text-accent">✓ Vous êtes inscrit !</p>
              ) : (
                <form onSubmit={handleNewsletter} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-accent min-w-0"
                  />
                  <button type="submit" aria-label="S'inscrire" className="p-2 bg-accent rounded-xl hover:bg-accent-600 transition-colors shrink-0">
                    <Send size={14} className="text-white" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Links — uniquement des routes qui existent */}
          {[
            {
              title: 'Marketplace',
              links: [
                { label: 'Toutes les annonces', href: '/products' },
                { label: 'Ordinateurs', href: '/products?categorySlug=ordinateurs' },
                { label: 'Composants', href: '/products?categorySlug=composants' },
                { label: 'Reconditionné LS', href: '/products?isReconditioned=true' },
                { label: 'Enchères en cours', href: '/auctions' },
              ],
            },
            {
              title: 'Vendeurs',
              links: [
                { label: 'Publier une annonce', href: '/products/create' },
                { label: 'Forfaits & Tarifs', href: '/pricing' },
                { label: 'Boutique Pro', href: '/pricing#pro' },
                { label: 'Mon tableau de bord', href: '/dashboard' },
              ],
            },
            {
              title: 'Aide',
              links: [
                { label: 'Comment ça marche', href: '/how-it-works' },
                { label: "Centre d'aide", href: '/help' },
                { label: 'Contacter le support', href: '/contact' },
                { label: 'Premium acheteur', href: '/premium' },
              ],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <h3 className="font-semibold text-sm mb-4 text-white/90">{title}</h3>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className="text-white/55 text-sm hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <div className="flex flex-wrap gap-4 text-sm text-white/55">
            <a href="mailto:support@lsgrouptogo.com" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail size={14} className="text-accent" />
              support@lsgrouptogo.com
            </a>
            <a href="https://wa.me/22890009385" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone size={14} className="text-accent" />
              WhatsApp : +228 90 00 93 85
            </a>
            <span className="flex items-center gap-2">
              <MapPin size={14} className="text-accent" />
              Lomé, Togo
            </span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-custom py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <span>© {new Date().getFullYear()} LS Marketplace. Tous droits réservés.</span>
          <div className="flex gap-4">
            <Link href="/legal" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
