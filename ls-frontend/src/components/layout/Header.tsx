'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ShoppingCart, Bell, Menu, X, User, LogOut,
  ChevronDown, ChevronRight, Laptop, Cpu, Wifi, Package, Tag,
  Heart, MessageSquare, LayoutDashboard, Settings,
  Shield, Zap, Monitor, HardDrive, Printer, Server,
  Smartphone, Headphones, Camera, Keyboard, Cable,
  Shirt, ShoppingBag, Sparkles, Bike, Car, Truck,
  Home, Sofa, Utensils, Baby, Dumbbell, BookOpen,
  Wrench, Tractor, Hammer, Music, Gamepad2,
  Leaf, Sun, Stethoscope, GraduationCap, Briefcase,
  Building2, Fish, PawPrint, Plane, Gem, Gavel,
  Wallet, Banknote,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '../common/LanguageSwitcher'
import ThemeToggle from '../common/ThemeToggle'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { cn, initials } from '@/lib/utils'

const categoryGroups = [
  {
    group: 'Informatique & High-Tech', icon: Laptop, color: 'text-blue-600', bg: 'bg-blue-50',
    items: [
      { name: 'Ordinateurs portables',   icon: Laptop,     slug: 'ordinateurs-portables', color: 'text-blue-600',    bg: 'bg-blue-50' },
      { name: 'PC de bureau',            icon: Monitor,    slug: 'pc-bureau',             color: 'text-indigo-600',  bg: 'bg-indigo-50' },
      { name: 'Composants PC',           icon: Cpu,        slug: 'composants',            color: 'text-purple-600',  bg: 'bg-purple-50' },
      { name: 'Smartphones & Tablettes', icon: Smartphone, slug: 'smartphones',           color: 'text-green-600',   bg: 'bg-green-50' },
      { name: 'Stockage & SSD',          icon: HardDrive,  slug: 'stockage',              color: 'text-cyan-600',    bg: 'bg-cyan-50' },
      { name: 'Reseau & Serveurs',       icon: Server,     slug: 'reseau-serveurs',       color: 'text-slate-600',   bg: 'bg-slate-50' },
      { name: 'Ecrans & Moniteurs',      icon: Monitor,    slug: 'ecrans',                color: 'text-orange-600',  bg: 'bg-orange-50' },
      { name: 'Audio & Casques',         icon: Headphones, slug: 'audio',                 color: 'text-pink-600',    bg: 'bg-pink-50' },
      { name: 'Imprimantes & Scanners',  icon: Printer,    slug: 'imprimantes',           color: 'text-rose-600',    bg: 'bg-rose-50' },
      { name: 'Cameras & Webcams',       icon: Camera,     slug: 'cameras',               color: 'text-red-600',     bg: 'bg-red-50' },
      { name: 'Claviers & Souris',       icon: Keyboard,   slug: 'claviers-souris',       color: 'text-yellow-600',  bg: 'bg-yellow-50' },
      { name: 'Cables & Adaptateurs',    icon: Cable,      slug: 'cables',                color: 'text-teal-600',    bg: 'bg-teal-50' },
      { name: 'Jeux video & Consoles',   icon: Gamepad2,   slug: 'jeux-video',            color: 'text-violet-600',  bg: 'bg-violet-50' },
      { name: 'Musique & Instruments',   icon: Music,      slug: 'musique',               color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
    ],
  },
  {
    group: 'Mode & Beaute', icon: Shirt, color: 'text-pink-600', bg: 'bg-pink-50',
    items: [
      { name: 'Vetements Homme',         icon: Shirt,      slug: 'vetements-homme',       color: 'text-blue-600',    bg: 'bg-blue-50' },
      { name: 'Vetements Femme',         icon: Shirt,      slug: 'vetements-femme',       color: 'text-pink-600',    bg: 'bg-pink-50' },
      { name: 'Vetements Enfants',       icon: Baby,       slug: 'vetements-enfants',     color: 'text-yellow-600',  bg: 'bg-yellow-50' },
      { name: 'Chaussures Homme',        icon: ShoppingBag,slug: 'chaussures-homme',      color: 'text-amber-600',   bg: 'bg-amber-50' },
      { name: 'Chaussures Femme',        icon: ShoppingBag,slug: 'chaussures-femme',      color: 'text-rose-600',    bg: 'bg-rose-50' },
      { name: 'Sacs & Maroquinerie',     icon: ShoppingBag,slug: 'sacs',                  color: 'text-orange-600',  bg: 'bg-orange-50' },
      { name: 'Produits de beaute',      icon: Sparkles,   slug: 'beaute',                color: 'text-purple-600',  bg: 'bg-purple-50' },
      { name: 'Parfums & Cosmetiques',   icon: Sparkles,   slug: 'parfums',               color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
      { name: 'Montres & Bijoux',        icon: Gem,        slug: 'montres-bijoux',        color: 'text-yellow-600',  bg: 'bg-yellow-50' },
      { name: 'Lunettes & Optique',      icon: Tag,        slug: 'lunettes',              color: 'text-cyan-600',    bg: 'bg-cyan-50' },
    ],
  },
  {
    group: 'Vehicules & Engins', icon: Car, color: 'text-orange-600', bg: 'bg-orange-50',
    items: [
      { name: 'Voitures (4 roues)',      icon: Car,        slug: 'voitures',              color: 'text-blue-600',    bg: 'bg-blue-50' },
      { name: 'Motos (2 roues)',         icon: Bike,       slug: 'motos',                 color: 'text-orange-600',  bg: 'bg-orange-50' },
      { name: 'Tricycles (3 roues)',     icon: Truck,      slug: 'tricycles',             color: 'text-green-600',   bg: 'bg-green-50' },
      { name: 'Camions & Utilitaires',   icon: Truck,      slug: 'camions',               color: 'text-slate-600',   bg: 'bg-slate-50' },
      { name: 'Engins de chantier',      icon: Tractor,    slug: 'engins-chantier',       color: 'text-yellow-600',  bg: 'bg-yellow-50' },
      { name: 'Engins agricoles',        icon: Tractor,    slug: 'engins-agricoles',      color: 'text-lime-600',    bg: 'bg-lime-50' },
      { name: 'Bateaux & Pirogues',      icon: Plane,      slug: 'bateaux',               color: 'text-cyan-600',    bg: 'bg-cyan-50' },
      { name: 'Pieces & Accessoires',    icon: Wrench,     slug: 'pieces-vehicules',      color: 'text-gray-600',    bg: 'bg-gray-50' },
    ],
  },
  {
    group: 'Maison & Jardin', icon: Home, color: 'text-amber-600', bg: 'bg-amber-50',
    items: [
      { name: 'Meubles & Decoration',   icon: Sofa,       slug: 'meubles',               color: 'text-amber-600',   bg: 'bg-amber-50' },
      { name: 'Electromenager',          icon: Home,       slug: 'electromenager',        color: 'text-blue-600',    bg: 'bg-blue-50' },
      { name: 'Cuisine & Arts de table', icon: Utensils,   slug: 'cuisine',               color: 'text-orange-600',  bg: 'bg-orange-50' },
      { name: 'Bricolage & Outils',      icon: Hammer,     slug: 'bricolage',             color: 'text-slate-600',   bg: 'bg-slate-50' },
      { name: 'Jardinage & Plantes',     icon: Leaf,       slug: 'jardinage',             color: 'text-green-600',   bg: 'bg-green-50' },
      { name: 'Energie & Solaire',       icon: Sun,        slug: 'energie-solaire',       color: 'text-yellow-600',  bg: 'bg-yellow-50' },
      { name: 'Bebe & Enfants',          icon: Baby,       slug: 'bebe-enfants',          color: 'text-pink-600',    bg: 'bg-pink-50' },
      { name: 'Produits menagers',       icon: Package,    slug: 'menage',                color: 'text-teal-600',    bg: 'bg-teal-50' },
    ],
  },
  {
    group: 'Alimentation & Agro', icon: Utensils, color: 'text-green-600', bg: 'bg-green-50',
    items: [
      { name: 'Alimentation generale',  icon: ShoppingBag,slug: 'alimentation',          color: 'text-green-600',   bg: 'bg-green-50' },
      { name: 'Boissons & Jus',          icon: Package,    slug: 'boissons',              color: 'text-blue-600',    bg: 'bg-blue-50' },
      { name: 'Epicerie & Condiments',   icon: Utensils,   slug: 'epicerie',              color: 'text-orange-600',  bg: 'bg-orange-50' },
      { name: 'Agriculture & Semences',  icon: Leaf,       slug: 'agriculture',           color: 'text-lime-600',    bg: 'bg-lime-50' },
      { name: 'Elevage & Betail',        icon: PawPrint,   slug: 'elevage',               color: 'text-amber-600',   bg: 'bg-amber-50' },
      { name: 'Peche & Aquaculture',     icon: Fish,       slug: 'peche',                 color: 'text-cyan-600',    bg: 'bg-cyan-50' },
      { name: 'Animaux domestiques',     icon: PawPrint,   slug: 'animaux',               color: 'text-rose-600',    bg: 'bg-rose-50' },
    ],
  },
  {
    group: 'Sante & Bien-etre', icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-50',
    items: [
      { name: 'Medicaments & Pharma',    icon: Stethoscope,slug: 'pharmacie',             color: 'text-red-600',     bg: 'bg-red-50' },
      { name: 'Materiel medical',        icon: Stethoscope,slug: 'materiel-medical',      color: 'text-rose-600',    bg: 'bg-rose-50' },
      { name: 'Sport & Fitness',         icon: Dumbbell,   slug: 'sport',                 color: 'text-green-600',   bg: 'bg-green-50' },
      { name: 'Bien-etre & Spa',         icon: Sparkles,   slug: 'bien-etre',             color: 'text-purple-600',  bg: 'bg-purple-50' },
    ],
  },
  {
    group: 'Immobilier & BTP', icon: Building2, color: 'text-slate-600', bg: 'bg-slate-50',
    items: [
      { name: 'Terrains a vendre',       icon: Building2,  slug: 'terrain',               color: 'text-green-600',   bg: 'bg-green-50' },
      { name: 'Maisons & Villas',        icon: Home,       slug: 'maisons',               color: 'text-blue-600',    bg: 'bg-blue-50' },
      { name: 'Appartements',            icon: Building2,  slug: 'appartements',          color: 'text-indigo-600',  bg: 'bg-indigo-50' },
      { name: 'Location',                icon: Tag,        slug: 'location',              color: 'text-orange-600',  bg: 'bg-orange-50' },
      { name: 'Materiaux de construction',icon: Hammer,    slug: 'materiaux',             color: 'text-slate-600',   bg: 'bg-slate-50' },
      { name: 'Equipements BTP',         icon: Tractor,    slug: 'equipements-btp',       color: 'text-yellow-600',  bg: 'bg-yellow-50' },
    ],
  },
  {
    group: 'Services & Emploi', icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50',
    items: [
      { name: 'Offres d emploi',         icon: Briefcase,     slug: 'emploi',             color: 'text-blue-600',    bg: 'bg-blue-50' },
      { name: 'Freelance & Missions',    icon: Briefcase,     slug: 'freelance',          color: 'text-violet-600',  bg: 'bg-violet-50' },
      { name: 'Formation & Cours',       icon: GraduationCap, slug: 'formation',          color: 'text-indigo-600',  bg: 'bg-indigo-50' },
      { name: 'Services a domicile',     icon: Home,          slug: 'services-domicile',  color: 'text-orange-600',  bg: 'bg-orange-50' },
      { name: 'Transport & Livraison',   icon: Truck,         slug: 'transport',          color: 'text-green-600',   bg: 'bg-green-50' },
      { name: 'Evenementiel',            icon: Music,         slug: 'evenementiel',       color: 'text-pink-600',    bg: 'bg-pink-50' },
      { name: 'Tourisme & Voyages',      icon: Plane,         slug: 'tourisme',           color: 'text-cyan-600',    bg: 'bg-cyan-50' },
    ],
  },
  {
    group: 'Loisirs & Culture', icon: Gamepad2, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50',
    items: [
      { name: 'Jeux video & Consoles',   icon: Gamepad2,   slug: 'jeux-video',            color: 'text-violet-600',  bg: 'bg-violet-50' },
      { name: 'Livres & BD',             icon: BookOpen,   slug: 'livres',                color: 'text-indigo-600',  bg: 'bg-indigo-50' },
      { name: 'Musique & Instruments',   icon: Music,      slug: 'musique',               color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
      { name: 'Films & Series',          icon: Camera,     slug: 'films',                 color: 'text-red-600',     bg: 'bg-red-50' },
      { name: 'Art & Artisanat',         icon: Sparkles,   slug: 'art-artisanat',         color: 'text-amber-600',   bg: 'bg-amber-50' },
      { name: 'Jouets & Jeux',           icon: Gamepad2,   slug: 'jouets',                color: 'text-yellow-600',  bg: 'bg-yellow-50' },
    ],
  },
  {
    group: 'Dons & Echanges', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50',
    items: [
      { name: 'Dons & Gratuit',          icon: Heart,      slug: 'dons',                  color: 'text-rose-600',    bg: 'bg-rose-50' },
      { name: 'Echanges & Troc',         icon: Tag,        slug: 'troc',                  color: 'text-amber-600',   bg: 'bg-amber-50' },
      { name: 'Antiquites & Collections',icon: Gem,        slug: 'antiquites',            color: 'text-yellow-600',  bg: 'bg-yellow-50' },
      { name: 'Divers & Autres',         icon: Package,    slug: 'divers',                color: 'text-gray-600',    bg: 'bg-gray-50' },
    ],
  },
]

export default function Header() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { totalItems } = useCartStore()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState<string>(categoryGroups[0].group)
  const catRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/products?search=${encodeURIComponent(search)}`)
  }

  const t = useTranslations('nav')
  const cartCount = totalItems()
  const activeItems = categoryGroups.find(g => g.group === activeGroup)?.items || []

  return (
    <>
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white shadow-nav' : 'bg-white/95 backdrop-blur-sm'
      )}>
        {/* Top bar */}
        <div className="bg-gradient-primary text-white py-1.5 hidden md:block">
          <div className="container-custom flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Zap size={11} className="text-yellow-300" />
                {t('topbar_payment')}
              </span>
              <span className="text-white/30">|</span>
              <span className="text-white/70">{t('topbar_countries')}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auctions" className="flex items-center gap-1 hover:text-yellow-300 transition-colors">
                <Gavel size={10} /> Enchères
              </Link>
              <Link href="/products?isReconditioned=true" className="flex items-center gap-1 hover:text-yellow-300 transition-colors">
                <Shield size={10} /> {t('reconditioned')}
              </Link>
              <a href="/#pricing" className="hover:text-yellow-300 transition-colors">{t('pricing')}</a>
              <Link href="/help" className="hover:text-yellow-300 transition-colors">{t('help')}</Link>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div className="container-custom py-3">
          <div className="flex items-center gap-3">

            {/* Categories — au clic, panneau 2 colonnes */}
            <div ref={catRef} className="relative hidden md:block shrink-0">
              <button
                onClick={() => setCatOpen(!catOpen)}
                aria-expanded={catOpen}
                aria-haspopup="true"
                aria-label={t('browse_categories')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                  catOpen ? 'bg-primary text-white' : 'text-dark hover:bg-gray-100'
                )}
              >
                <Menu size={16} aria-hidden="true" />
                <span>{t('categories')}</span>
                <ChevronDown size={13} aria-hidden="true" className={cn('transition-transform duration-200', catOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {catOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute top-full left-0 mt-2 flex bg-white rounded-2xl border border-gray-100 overflow-hidden"
                    style={{ zIndex: 60, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: 560 }}
                  >
                    {/* Colonne gauche — liste des groupes */}
                    <div className="w-52 border-r border-gray-100 py-2 shrink-0 overflow-y-auto" style={{ maxHeight: 440 }}>
                      {categoryGroups.map((group) => {
                        const Icon = group.icon
                        const isActive = activeGroup === group.group
                        return (
                          <button
                            key={group.group}
                            onClick={() => setActiveGroup(group.group)}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                              isActive ? 'bg-primary/5 text-primary' : 'text-dark hover:bg-gray-50'
                            )}
                          >
                            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', isActive ? 'bg-primary/10' : group.bg)}>
                              <Icon size={13} className={isActive ? 'text-primary' : group.color} />
                            </div>
                            <span className="text-xs font-medium flex-1 text-left leading-tight">{group.group}</span>
                            <ChevronRight size={12} className={cn('shrink-0', isActive ? 'text-primary' : 'text-gray-300')} />
                          </button>
                        )
                      })}
                    </div>

                    {/* Colonne droite — items du groupe actif */}
                    <div className="flex-1 p-3 overflow-y-auto" style={{ maxHeight: 440 }}>
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 px-1">{activeGroup}</p>
                      <div className="grid grid-cols-2 gap-0.5">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeGroup}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                            className="contents"
                          >
                            {activeItems.map((cat) => (
                              <Link
                                key={cat.slug}
                                href={`/products?categorySlug=${cat.slug}`}
                                onClick={() => setCatOpen(false)}
                                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                              >
                                <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', cat.bg)}>
                                  <cat.icon size={12} className={cat.color} />
                                </div>
                                <span className="text-xs text-dark group-hover:text-primary leading-tight">{cat.name}</span>
                              </Link>
                            ))}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-black text-lg leading-none">L</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-black text-primary text-lg leading-none">LS</div>
                <div className="text-[9px] text-muted leading-none tracking-widest uppercase">Marketplace</div>
              </div>
            </Link>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="input pr-12 py-2.5" />
                <button type="submit" aria-label={t('search_action')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors">
                  <Search size={16} aria-hidden="true" />
                </button>
              </div>
            </form>

            {/* Vendre CTA */}
            <Link href="/products/create"
              className="hidden md:flex items-center gap-1.5 bg-accent text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-accent/80 transition-all shrink-0 shadow-sm">
              <Zap size={13} /> {t('sell')}
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle className="hidden md:flex" />
              <Link href="/cart" aria-label={cartCount > 0 ? t('cart_count', { count: cartCount }) : t('cart')} className="relative btn-icon text-dark hover:bg-gray-100">
                <ShoppingCart size={20} aria-hidden="true" />
                {cartCount > 0 && (
                  <span aria-hidden="true" className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <>
                  <Link href="/notifications" aria-label={t('notifications')} className="btn-icon text-dark hover:bg-gray-100 hidden md:flex">
                    <Bell size={20} aria-hidden="true" />
                  </Link>
                  <div className="relative">
                    <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                      aria-label={t('user_menu')}
                      aria-expanded={userMenuOpen}
                      aria-haspopup="menu"
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {user?.profile?.avatarUrl
                          ? <img src={user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : initials(user?.firstName || '', user?.lastName || '')}
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-xs font-semibold text-dark leading-none">{user?.firstName}</div>
                        <div className="text-[10px] text-muted leading-none mt-0.5">{user?.subscription?.plan || 'FREE'}</div>
                      </div>
                      <ChevronDown size={13} className="text-muted hidden md:block" />
                    </button>
                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-card-hover border border-border/50 overflow-hidden"
                        >
                          <div className="p-3 border-b border-border bg-surface">
                            <div className="text-sm font-semibold text-dark">{user?.firstName} {user?.lastName}</div>
                            <div className="text-xs text-muted truncate">{user?.email}</div>
                          </div>
                          <div className="p-2">
                            {[
                              { icon: LayoutDashboard, label: t('dashboard'),  href: '/dashboard' },
                              { icon: Package,         label: t('orders'),    href: '/dashboard/buyer' },
                              { icon: Wallet,          label: 'Portefeuille', href: '/dashboard/wallet' },
                              { icon: Heart,           label: t('favorites'), href: '/dashboard/buyer' },
                              { icon: MessageSquare,   label: t('messages'),  href: '/chat' },
                              { icon: Settings,        label: t('settings'),  href: '/profile' },
                              ...(['ADMIN', 'MODERATOR'].includes(user?.role || '')
                                ? [{ icon: Banknote, label: 'Retraits', href: '/admin/payouts' }]
                                : []),
                            ].map(({ icon: Icon, label, href }) => (
                              <Link key={href} href={href} onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-sm text-dark hover:text-primary transition-colors">
                                <Icon size={15} className="text-muted" />
                                {label}
                              </Link>
                            ))}
                            <div className="border-t border-border mt-1 pt-1">
                              <button onClick={() => { logout(); setUserMenuOpen(false); router.push('/') }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm text-danger transition-colors">
                                <LogOut size={15} /> {t('logout')}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login" className="btn-ghost btn-sm hidden md:flex">{t('login')}</Link>
                  <Link href="/auth/register" className="btn-primary btn-sm">
                    <span className="hidden sm:inline">{t('register')}</span>
                    <span className="sm:hidden"><User size={16} /></span>
                  </Link>
                </div>
              )}
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? t('close_menu') : t('open_menu')} aria-expanded={mobileOpen} className="btn-icon text-dark hover:bg-gray-100 md:hidden">
                {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-40 bg-white pt-20 overflow-y-auto"
          >
            <div className="p-4">
              <form onSubmit={(e) => { handleSearch(e); setMobileOpen(false) }} className="mb-4">
                <div className="relative">
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('search_placeholder')} className="input pr-12" />
                  <button type="submit" aria-label={t('search_action')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg">
                    <Search size={16} aria-hidden="true" />
                  </button>
                </div>
              </form>
              <div className="flex items-center justify-between px-3 py-1.5 mb-3 rounded-xl bg-gray-50">
                <span className="text-sm font-medium text-dark">Thème</span>
                <ThemeToggle />
              </div>
              {categoryGroups.map((group) => {
                const Icon = group.icon
                return (
                  <div key={group.group} className="mb-1">
                    <button
                      onClick={() => setActiveGroup(activeGroup === group.group ? '' : group.group)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50"
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', group.bg)}>
                        <Icon size={14} className={group.color} />
                      </div>
                      <span className="text-sm font-semibold text-dark flex-1 text-left">{group.group}</span>
                      <ChevronDown size={14} className={cn('text-muted transition-transform', activeGroup === group.group && 'rotate-180')} />
                    </button>
                    {activeGroup === group.group && (
                      <div className="ml-10 mt-1 mb-2 space-y-0.5">
                        {group.items.map((cat) => (
                          <Link key={cat.slug} href={`/products?categorySlug=${cat.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-dark">
                            <cat.icon size={13} className={cat.color} />
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {isAuthenticated ? (
                <div className="mt-4 pt-4 border-t border-border space-y-1">
                  {[
                    { label: t('dashboard'), href: '/dashboard' },
                    { label: 'Portefeuille', href: '/dashboard/wallet' },
                    { label: t('messages'),  href: '/chat' },
                    { label: t('orders'),    href: '/dashboard/buyer' },
                    { label: t('settings'),  href: '/profile' },
                    ...(['ADMIN', 'MODERATOR'].includes(user?.role || '')
                      ? [{ label: 'Retraits', href: '/admin/payouts' }]
                      : []),
                  ].map(({ label, href }) => (
                    <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-3 rounded-xl hover:bg-gray-50 font-medium text-dark">{label}</Link>
                  ))}
                  <button onClick={() => { logout(); setMobileOpen(false) }}
                    className="w-full text-left px-3 py-3 rounded-xl text-danger font-medium hover:bg-red-50">
                    {t('logout')}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="btn-outline w-full justify-center">{t('login')}</Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="btn-primary w-full justify-center">{t('register')}</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {userMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />}
    </>
  )
}
