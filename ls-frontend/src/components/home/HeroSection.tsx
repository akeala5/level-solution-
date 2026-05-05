'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Shield, Zap, Award, Laptop, Cpu, Wifi, Monitor, HardDrive, Printer, Smartphone, Camera, Headphones, Keyboard } from 'lucide-react'

const TRENDING = ['Laptop gaming', 'RTX 4080', 'MacBook Pro', 'iPhone recondit.', 'Switch réseau']

const floatingCards = [
  { icon: Laptop,    label: 'MacBook Air M2',    price: '850 000 FCFA',   badge: 'Reconditionné LS', color: 'from-blue-500 to-blue-600',    topColor: '#3B82F6', delay: 0    },
  { icon: Cpu,       label: 'RTX 4080 16GB',     price: '1 200 000 FCFA', badge: 'Neuf',             color: 'from-purple-500 to-purple-600', topColor: '#A855F7', delay: 0.08 },
  { icon: Wifi,      label: 'Cisco Switch 24p',  price: '350 000 FCFA',   badge: 'Très bon état',    color: 'from-green-500 to-green-600',   topColor: '#22C55E', delay: 0.16 },
  { icon: Monitor,   label: 'Écran LG 27" 4K',   price: '420 000 FCFA',   badge: 'Neuf',             color: 'from-orange-500 to-orange-600', topColor: '#F97316', delay: 0.24 },
  { icon: HardDrive, label: 'SSD Samsung 2TB',   price: '95 000 FCFA',    badge: 'Neuf',             color: 'from-cyan-500 to-cyan-600',     topColor: '#06B6D4', delay: 0.32 },
  { icon: Printer,   label: 'HP LaserJet Pro',   price: '180 000 FCFA',   badge: 'Bon état',         color: 'from-rose-500 to-rose-600',     topColor: '#F43F5E', delay: 0.4  },
  { icon: Laptop,    label: 'Dell XPS 15 OLED',  price: '980 000 FCFA',   badge: 'Reconditionné LS', color: 'from-indigo-500 to-indigo-600', topColor: '#6366F1', delay: 0.48 },
]

const stats = [
  { value: '10k+', label: 'Annonces actives' },
  { value: '2.4k', label: 'Vendeurs vérifiés' },
  { value: '98%',  label: 'Satisfaction' },
]

const carouselProducts = [
  { icon: Smartphone, label: 'iPhone 15 Pro',      color: 'from-gray-700 to-gray-900',    badge: 'Neuf' },
  { icon: Laptop,     label: 'ThinkPad X1 Carbon', color: 'from-red-600 to-red-800',      badge: 'Recondit.' },
  { icon: Camera,     label: 'Canon EOS R50',       color: 'from-gray-600 to-gray-800',    badge: 'Neuf' },
  { icon: Headphones, label: 'Sony WH-1000XM5',    color: 'from-slate-600 to-slate-800',  badge: 'Neuf' },
  { icon: Monitor,    label: 'Dell U2723D 27"',     color: 'from-blue-700 to-blue-900',    badge: 'Neuf' },
  { icon: Keyboard,   label: 'Keychron Q5 Pro',     color: 'from-amber-600 to-amber-800',  badge: 'Neuf' },
  { icon: Cpu,        label: 'Ryzen 9 7950X',       color: 'from-orange-600 to-orange-800',badge: 'Neuf' },
  { icon: HardDrive,  label: 'NAS Synology DS923+', color: 'from-teal-600 to-teal-800',    badge: 'Neuf' },
  { icon: Smartphone, label: 'Samsung S24 Ultra',   color: 'from-violet-600 to-violet-800',badge: 'Neuf' },
  { icon: Wifi,       label: 'UniFi Dream Router',  color: 'from-cyan-600 to-cyan-800',    badge: 'Neuf' },
]

export default function HeroSection() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex(i => (i + 1) % carouselProducts.length)
    }, 17000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/products?search=${encodeURIComponent(search)}`)
    else router.push('/products')
  }

  const slide = carouselProducts[slideIndex]

  return (
    <section className="relative overflow-hidden bg-gradient-hero min-h-[640px] flex items-center">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl" />

      <div className="container-custom relative z-10 py-16 lg:py-20">
        <div className="grid lg:grid-cols-[1fr_160px_220px] gap-8 items-center">

          {/* ── COL 1 : Texte hero ── */}
          <div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-medium px-4 py-2 rounded-full border border-white/20 mb-6">
                <Zap size={12} className="text-yellow-400" />
                Marketplace N°1 en Afrique francophone
              </div>

              <h1 className="heading-xl text-white mb-4">
                Achetez &amp; Vendez{' '}
                <span className="text-yellow-400">tout</span>{' '}
                en toute sécurité
              </h1>

              <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-xl">
                Informatique, mode, véhicules, immobilier — des milliers d&apos;annonces vérifiées avec paiement Mobile Money sécurisé.
              </p>

              {/* Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="flex gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-1.5">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Que recherchez-vous ?"
                    className="flex-1 bg-transparent text-white placeholder:text-white/50 px-4 py-3 text-sm focus:outline-none"
                  />
                  <button type="submit" className="btn-accent rounded-xl px-6 py-3 shrink-0 flex items-center gap-1">
                    <Search size={18} />
                    <span className="hidden sm:inline text-sm font-semibold">Rechercher</span>
                  </button>
                </div>
              </form>

              {/* Trending */}
              <div className="flex items-center flex-wrap gap-2 mb-5">
                <span className="text-white/50 text-xs">Tendances :</span>
                {TRENDING.map((term) => (
                  <button key={term}
                    onClick={() => router.push(`/products?search=${encodeURIComponent(term)}`)}
                    className="text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full border border-white/10 transition-all">
                    {term}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-5">
                {stats.map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }} className="flex items-center gap-2">
                    <span className="text-xl font-black text-yellow-400 leading-none">{s.value}</span>
                    <span className="text-white/60 text-xs leading-tight">{s.label}</span>
                    {i < stats.length - 1 && <span className="text-white/20 ml-3">|</span>}
                  </motion.div>
                ))}
              </div>

              {/* Trust */}
              <div className="flex flex-wrap gap-4 mt-5">
                {[
                  { icon: Shield, text: 'Escrow sécurisé' },
                  { icon: Zap,    text: 'Mobile Money' },
                  { icon: Award,  text: 'Vendeurs vérifiés' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-white/60 text-xs">
                    <Icon size={13} className="text-accent" />
                    {text}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── COL 2 : Slideshow ── */}
          <div className="hidden lg:flex flex-col items-center justify-center h-[520px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                whileHover={{ scale: 1.04, y: -4 }}
                className="rounded-xl overflow-hidden border border-white/10 w-full cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: hovered ? `0 8px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.2)` : 'none',
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                {/* Image simulée */}
                <div className={`h-36 bg-gradient-to-br ${slide.color} flex items-center justify-center relative overflow-hidden`}>
                  <slide.icon
                    size={48}
                    className="text-white/30 transition-all duration-300"
                    style={{ transform: hovered ? 'scale(1.2)' : 'scale(1)', opacity: hovered ? 0.5 : 0.3 }}
                  />
                  {/* Overlay au survol */}
                  <div
                    className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300"
                    style={{ opacity: hovered ? 1 : 0 }}
                  >
                    <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                      Voir l&apos;annonce →
                    </span>
                  </div>
                  <span className="absolute top-2 right-2 text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                    {slide.badge}
                  </span>
                </div>
                <div className="px-3 py-2.5">
                  <div className="text-white text-xs font-semibold truncate">{slide.label}</div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex gap-1.5 mt-4">
              {carouselProducts.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === slideIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── COL 3 : Cartes produits ── */}
          <div className="hidden lg:flex flex-col gap-2 justify-center items-end">
            {floatingCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: card.delay + 0.2 }}
                className="bg-white/20 backdrop-blur-md rounded-xl p-3.5 flex items-center gap-3 w-52 border border-white/10"
                style={{
                  animation: `bounceSoft ${2.8 + i * 0.3}s ease-in-out infinite ${i * 0.25}s`,
                  borderTop: `2px solid ${card.topColor}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shrink-0`}>
                  <card.icon size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm leading-tight truncate">{card.label}</div>
                  <div className="text-yellow-400 font-bold text-sm mt-0.5">{card.price}</div>
                  <div className="text-[11px] text-white/60">{card.badge}</div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
