'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ShoppingCart, Bell, Menu, X, User, LogOut,
  ChevronDown, Laptop, Cpu, Wifi, Package, Tag,
  Heart, MessageSquare, LayoutDashboard, Settings,
  Shield, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { cn, initials } from '@/lib/utils'

const categories = [
  { name: 'Ordinateurs', icon: Laptop, slug: 'ordinateurs', color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Composants', icon: Cpu, slug: 'composants', color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Réseau', icon: Wifi, slug: 'reseau-serveurs', color: 'text-green-600', bg: 'bg-green-50' },
  { name: 'Périphériques', icon: Package, slug: 'peripheriques', color: 'text-orange-600', bg: 'bg-orange-50' },
  { name: 'Accessoires', icon: Tag, slug: 'accessoires', color: 'text-pink-600', bg: 'bg-pink-50' },
]

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { items, totalItems } = useCartStore()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [catOpen, setCatOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/products?search=${encodeURIComponent(search)}`)
  }

  const cartCount = totalItems()

  return (
    <>
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'
      )}>
        {/* Top bar */}
        <div className="bg-gradient-primary text-white py-1.5 hidden md:block">
          <div className="container-custom flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Zap size={11} className="text-accent" />
                Paiement Mobile Money disponible
              </span>
              <span>|</span>
              <span>Togo · Côte d'Ivoire · Sénégal</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/categories/reconditionne-ls" className="hover:text-accent-300 transition-colors">
                Reconditionné LS ✓
              </Link>
              <Link href="/help" className="hover:text-accent-300 transition-colors">Aide</Link>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div className="container-custom py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-display font-black text-lg leading-none">L</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-display font-black text-primary text-lg leading-none">LS</div>
                <div className="text-[9px] text-muted leading-none tracking-widest uppercase">Marketplace</div>
              </div>
            </Link>

            {/* Categories dropdown */}
            <div className="relative hidden md:block" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-dark hover:bg-surface transition-colors">
                <Menu size={16} />
                Catégories
                <ChevronDown size={14} className={cn('transition-transform', catOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {catOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-card-hover border border-border/50 overflow-hidden"
                  >
                    <div className="p-2">
                      {categories.map((cat) => (
                        <Link key={cat.slug} href={`/products?categorySlug=${cat.slug}`}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors group">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cat.bg)}>
                            <cat.icon size={16} className={cat.color} />
                          </div>
                          <span className="text-sm font-medium text-dark group-hover:text-primary transition-colors">{cat.name}</span>
                        </Link>
                      ))}
                      <div className="border-t border-border mt-1 pt-1">
                        <Link href="/products?isReconditioned=true"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent-50 transition-colors group">
                          <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
                            <Shield size={16} className="text-accent" />
                          </div>
                          <span className="text-sm font-medium text-accent">Reconditionné LS ✓</span>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit, une marque..."
                  className="input pr-12 py-2.5 rounded-xl border-primary/20 focus:border-primary"
                />
                <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <Search size={16} />
                </button>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Cart */}
              <Link href="/cart" className="relative btn-icon text-dark hover:bg-surface">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <>
                  {/* Notifications */}
                  <Link href="/notifications" className="relative btn-icon text-dark hover:bg-surface hidden md:flex">
                    <Bell size={20} />
                  </Link>

                  {/* User menu */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {user?.profile?.avatarUrl
                          ? <img src={user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : initials(user?.firstName || '', user?.lastName || '')}
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-xs font-semibold text-dark leading-none">{user?.firstName}</div>
                        <div className="text-[10px] text-muted leading-none mt-0.5">{user?.subscription?.plan || 'FREE'}</div>
                      </div>
                      <ChevronDown size={14} className="text-muted hidden md:block" />
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
                              { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
                              { icon: Package, label: 'Mes commandes', href: '/dashboard/orders' },
                              { icon: Heart, label: 'Mes favoris', href: '/dashboard/favorites' },
                              { icon: MessageSquare, label: 'Messages', href: '/chat' },
                              { icon: Settings, label: 'Paramètres', href: '/profile' },
                            ].map(({ icon: Icon, label, href }) => (
                              <Link key={href} href={href}
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface text-sm text-dark hover:text-primary transition-colors">
                                <Icon size={16} className="text-muted" />
                                {label}
                              </Link>
                            ))}
                            <div className="border-t border-border mt-1 pt-1">
                              <button
                                onClick={() => { logout(); setUserMenuOpen(false); router.push('/') }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm text-danger transition-colors">
                                <LogOut size={16} />
                                Déconnexion
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
                  <Link href="/auth/login" className="btn-ghost btn-sm hidden md:flex">Connexion</Link>
                  <Link href="/auth/register" className="btn-primary btn-sm">
                    <span className="hidden sm:inline">Inscription</span>
                    <span className="sm:hidden"><User size={16} /></span>
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="btn-icon text-dark hover:bg-surface md:hidden">
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
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
            className="fixed inset-0 z-40 bg-white pt-20"
          >
            <div className="p-4 overflow-y-auto h-full">
              <div className="mb-4">
                <form onSubmit={(e) => { handleSearch(e); setMobileOpen(false) }}>
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="input pr-12"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg">
                      <Search size={16} />
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted font-semibold uppercase tracking-wider px-3 mb-2">Catégories</p>
                {categories.map((cat) => (
                  <Link key={cat.slug} href={`/products?categorySlug=${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', cat.bg)}>
                      <cat.icon size={18} className={cat.color} />
                    </div>
                    <span className="font-medium text-dark">{cat.name}</span>
                  </Link>
                ))}
              </div>

              {isAuthenticated ? (
                <div className="mt-4 pt-4 border-t border-border space-y-1">
                  {[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Messages', href: '/chat' },
                    { label: 'Mes commandes', href: '/dashboard/orders' },
                    { label: 'Profil', href: '/profile' },
                  ].map(({ label, href }) => (
                    <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-3 rounded-xl hover:bg-surface font-medium text-dark">
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={() => { logout(); setMobileOpen(false) }}
                    className="w-full text-left px-3 py-3 rounded-xl text-danger font-medium hover:bg-red-50">
                    Déconnexion
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="btn-outline w-full justify-center">
                    Connexion
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="btn-primary w-full justify-center">
                    Créer un compte
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      {(userMenuOpen) && (
        <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
      )}
    </>
  )
}
