'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Shield, Zap, Award, ChevronRight, Laptop, Cpu, Wifi } from 'lucide-react'

const TRENDING = ['Laptop gaming', 'RTX 4080', 'MacBook Pro', 'iPhone recondit.', 'Switch réseau']

const floatingCards = [
  { icon: Laptop, label: 'MacBook Air M2', price: '850 000 FCFA', badge: 'Reconditionné LS', color: 'from-blue-500 to-blue-600', delay: 0 },
  { icon: Cpu, label: 'RTX 4080 16GB', price: '1 200 000 FCFA', badge: 'Neuf', color: 'from-purple-500 to-purple-600', delay: 0.2 },
  { icon: Wifi, label: 'Cisco Switch 24p', price: '350 000 FCFA', badge: 'Très bon état', color: 'from-green-500 to-green-600', delay: 0.4 },
]

export default function HeroSection() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/products?search=${encodeURIComponent(search)}`)
    else router.push('/products')
  }

  return (
    <section className="relative overflow-hidden bg-gradient-hero min-h-[600px] flex items-center">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Glow effects */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl" />

      <div className="container-custom relative z-10 py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-medium px-4 py-2 rounded-full border border-white/20 mb-6">
                <Zap size={12} className="text-accent" />
                Marketplace N°1 en Afrique francophone
              </div>

              <h1 className="heading-xl text-white mb-4">
                Achetez & Vendez vos{' '}
                <span className="text-accent">équipements IT</span>{' '}
                en toute sécurité
              </h1>

              <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-xl">
                Ordinateurs, composants, réseau — des milliers d'annonces vérifiées avec paiement Mobile Money sécurisé.
              </p>

              {/* Search */}
              <form onSubmit={handleSearch} className="relative mb-4">
                <div className="flex gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-1.5">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Que recherchez-vous ?"
                    className="flex-1 bg-transparent text-white placeholder:text-white/50 px-4 py-3 text-sm focus:outline-none"
                  />
                  <button type="submit" className="btn-accent rounded-xl px-6 py-3 shrink-0">
                    <Search size={18} />
                    <span className="hidden sm:inline ml-1">Rechercher</span>
                  </button>
                </div>
              </form>

              {/* Trending */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-white/50 text-xs">Tendances :</span>
                {TRENDING.map((term) => (
                  <button key={term}
                    onClick={() => router.push(`/products?search=${encodeURIComponent(term)}`)}
                    className="text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full border border-white/10 transition-all">
                    {term}
                  </button>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 mt-8">
                {[
                  { icon: Shield, text: 'Escrow sécurisé' },
                  { icon: Zap, text: 'Mobile Money' },
                  { icon: Award, text: 'Vendeurs vérifiés' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-white/60 text-xs">
                    <Icon size={14} className="text-accent" />
                    {text}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right — Floating cards */}
          <div className="relative hidden lg:block h-96">
            {floatingCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: card.delay + 0.3 }}
                className={`absolute bg-white rounded-2xl shadow-2xl p-4 w-56 ${
                  i === 0 ? 'top-4 right-8' : i === 1 ? 'top-1/2 -translate-y-1/2 right-0' : 'bottom-4 right-12'
                }`}
                style={{ animation: `bounceSoft ${2 + i * 0.5}s ease-in-out infinite ${i * 0.5}s` }}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                  <card.icon size={20} className="text-white" />
                </div>
                <div className="text-xs text-muted mb-1">{card.badge}</div>
                <div className="font-semibold text-dark text-sm leading-snug mb-1">{card.label}</div>
                <div className="text-primary font-bold text-sm">{card.price}</div>
              </motion.div>
            ))}

            {/* Center stats card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="absolute top-1/2 left-4 -translate-y-1/2 bg-gradient-accent rounded-2xl p-5 text-white w-44 shadow-glow"
            >
              <div className="text-3xl font-black font-display mb-1">10k+</div>
              <div className="text-sm text-white/80">Annonces actives</div>
              <div className="flex items-center gap-1 mt-2 text-xs text-white/70">
                <span>Voir les annonces</span>
                <ChevronRight size={12} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
