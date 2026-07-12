'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package, TrendingUp, DollarSign, Eye, Plus, Edit3,
  Trash2, ToggleLeft, ToggleRight, Star, Users, Clock,
  CheckCircle, Loader2, AlertCircle, BarChart3, ShoppingBag, Award,
  Heart, ArrowUpRight, Activity,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, formatNumber, timeAgo, getStatusLabel, cn, imgBlurDataURL } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'overview',   label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'analytics',  label: 'Analytiques',      icon: TrendingUp },
  { id: 'products',   label: 'Mes annonces',      icon: Package },
  { id: 'orders',     label: 'Commandes reçues',  icon: ShoppingBag },
  { id: 'reviews',    label: 'Avis reçus',         icon: Star },
]

const STATUS_BAR_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', PAYMENT_CONFIRMED: '#3b82f6', PROCESSING: '#8b5cf6',
  SHIPPED: '#6366f1', DELIVERED: '#22c55e', COMPLETED: '#10b981',
  CANCELLED: '#ef4444', DISPUTED: '#f97316',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:           'bg-amber-100 text-amber-700',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING:        'bg-purple-100 text-purple-700',
  SHIPPED:           'bg-indigo-100 text-indigo-700',
  DELIVERED:         'bg-green-100 text-green-700',
  COMPLETED:         'bg-emerald-100 text-emerald-700',
  CANCELLED:         'bg-red-100 text-red-700',
  DISPUTED:          'bg-orange-100 text-orange-700',
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/auth/login')
  }, [_hasHydrated, isAuthenticated, router])

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ['seller-stats'],
    queryFn: () => api.get('/users/me/dashboard').then((r) => r.data.data),
    enabled: isAuthenticated,
  })

  // Products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => api.get('/products/me/listings').then((r) => r.data.data),
    enabled: isAuthenticated && (activeTab === 'products' || activeTab === 'overview'),
  })

  // Orders received
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => api.get('/orders/selling').then((r) => r.data.data),
    enabled: isAuthenticated && activeTab === 'orders',
  })

  // Analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['seller-analytics', analyticsPeriod],
    queryFn: () => api.get(`/users/me/analytics?period=${analyticsPeriod}`).then((r) => r.data.data),
    enabled: isAuthenticated && activeTab === 'analytics',
  })

  // Reviews received
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['seller-reviews'],
    queryFn: () => api.get(`/reviews/seller/${user?.id}`).then((r) => r.data.data),
    enabled: isAuthenticated && activeTab === 'reviews' && !!user?.id,
  })

  const toggleProductMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/products/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      toast.success('Statut mis à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      toast.success('Annonce supprimée')
    },
    onError: () => toast.error('Impossible de supprimer cette annonce'),
  })

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      toast.success('Commande mise à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      api.patch(`/reviews/${reviewId}/reply`, { reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-reviews'] })
      toast.success('Réponse publiée')
      setReplyingTo(null)
      setReplyText('')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Impossible de répondre'),
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const products = productsData?.products || productsData || []
  const orders = ordersData?.orders || ordersData || []
  const reviews = reviewsData?.reviews || reviewsData || []

  const overviewStats = [
    {
      label: 'Total des ventes',
      value: formatPrice(statsData?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Commandes',
      value: formatNumber(statsData?.totalOrders || 0),
      icon: ShoppingBag,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Annonces actives',
      value: formatNumber(products.filter((p: any) => p.status === 'ACTIVE').length),
      icon: Package,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Note moyenne',
      value: statsData?.avgRating ? `${statsData.avgRating.toFixed(1)}/5` : '—',
      icon: Star,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="heading-sm text-dark">Tableau de bord vendeur</h1>
            <p className="text-muted text-sm">
              {user?.sellerProfile?.shopName || `${user?.firstName} ${user?.lastName}`}
              {user?.isKycVerified && (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-600 text-xs">
                  <Award size={12} /> KYC vérifié
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/seller/api" className="btn-outline btn-sm gap-1.5 text-xs">
              API
            </Link>
            <Link href="/dashboard/seller/webhooks" className="btn-outline btn-sm gap-1.5 text-xs">
              Webhooks
            </Link>
            <Link href="/products/create" className="btn-primary btn-sm gap-2">
              <Plus size={15} /> Nouvelle annonce
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-border/50 shadow-card">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', stat.bg)}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div className="text-xl font-black text-dark">{stat.value}</div>
              <div className="text-xs text-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border/50 rounded-2xl p-1 mb-5 shadow-card w-fit overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-dark hover:bg-surface'
              )}
            >
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Recent products */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-bold text-dark">Annonces récentes</h2>
                <button onClick={() => setActiveTab('products')} className="text-xs text-primary hover:underline">Tout voir</button>
              </div>
              {products.slice(0, 5).map((product: any) => (
                <div key={product.id} className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface border border-border flex-shrink-0">
                    {product.images?.[0]?.url ? (
                      <Image src={product.images[0].url} alt={product.title} width={40} height={40} className="object-cover w-full h-full" placeholder="blur" blurDataURL={imgBlurDataURL} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-muted" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark truncate">{product.title}</p>
                    <p className="text-xs text-muted">{formatPrice(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Eye size={12} /> {product.viewCount || 0}
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    product.status === 'ACTIVE' ? 'bg-success/10 text-success' : product.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' : 'bg-muted/10 text-muted'
                  )}>
                    {product.status === 'ACTIVE' ? 'Actif' : product.status === 'PENDING_REVIEW' ? 'En révision' : 'Inactif'}
                  </span>
                </div>
              ))}
              {products.length === 0 && (
                <div className="text-center py-10 text-muted text-sm">Aucune annonce publiée</div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            {/* Period selector */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted font-medium">Période d'analyse</p>
              <div className="flex gap-1 bg-white border border-border/50 rounded-xl p-1 shadow-card">
                {(['7d', '30d', '90d'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAnalyticsPeriod(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      analyticsPeriod === p ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-dark'
                    )}
                  >
                    {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
                  </button>
                ))}
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : !analyticsData ? null : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Revenus', value: formatPrice(analyticsData.summary.totalRevenue),
                      icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50',
                      gradient: 'from-emerald-500 to-teal-500',
                    },
                    {
                      label: 'Commandes', value: analyticsData.summary.totalOrders,
                      icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50',
                      gradient: 'from-blue-500 to-indigo-500',
                    },
                    {
                      label: 'Vues totales', value: formatNumber(analyticsData.summary.totalViews),
                      icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50',
                      gradient: 'from-violet-500 to-purple-500',
                    },
                    {
                      label: 'Conversion', value: `${analyticsData.summary.conversionRate}%`,
                      icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50',
                      gradient: 'from-amber-500 to-orange-500',
                    },
                  ].map((kpi) => (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-4 border border-border/50 shadow-card relative overflow-hidden"
                    >
                      <div className={cn('absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r', kpi.gradient)} />
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', kpi.bg)}>
                        <kpi.icon size={17} className={kpi.color} />
                      </div>
                      <div className="text-xl font-black text-dark">{kpi.value}</div>
                      <div className="text-xs text-muted mt-0.5">{kpi.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Revenue Chart */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-card p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <TrendingUp size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-dark">Revenus & Commandes</p>
                      <p className="text-xs text-muted">Évolution sur les {analyticsPeriod === '7d' ? '7' : analyticsPeriod === '30d' ? '30' : '90'} derniers jours</p>
                    </div>
                  </div>
                  {mounted && (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={analyticsData.revenueChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                          interval={analyticsPeriod === '7d' ? 0 : analyticsPeriod === '30d' ? 4 : 8} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={38} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                          formatter={(value: any, name: string) => [
                            name === 'revenue' ? formatPrice(value) : value,
                            name === 'revenue' ? 'Revenus' : 'Commandes',
                          ]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2}
                          fill="url(#gradRevenue)" dot={false} activeDot={{ r: 5, fill: '#10b981' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Orders by Status */}
                {analyticsData.ordersByStatus.length > 0 && (
                  <div className="bg-white rounded-2xl border border-border/50 shadow-card p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <BarChart3 size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark">Commandes par statut</p>
                        <p className="text-xs text-muted">Répartition sur la période sélectionnée</p>
                      </div>
                    </div>
                    {mounted && (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={analyticsData.ordersByStatus} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            formatter={(value: any) => [value, 'Commandes']}
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {analyticsData.ordersByStatus.map((entry: any) => (
                              <Cell key={entry.status} fill={STATUS_BAR_COLORS[entry.status] || '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}

                {/* Top 5 Products */}
                {analyticsData.topProducts.length > 0 && (
                  <div className="bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                        <Eye size={14} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark">Top 5 produits</p>
                        <p className="text-xs text-muted">Classés par nombre de vues</p>
                      </div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {analyticsData.topProducts.map((product: any, idx: number) => {
                        const maxViews = analyticsData.topProducts[0]?.viewCount || 1
                        const pct = Math.round((product.viewCount / maxViews) * 100)
                        return (
                          <div key={idx} className="px-5 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-black text-muted/60 w-4 shrink-0">{idx + 1}</span>
                                <p className="text-sm font-medium text-dark truncate">{product.title}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span className="flex items-center gap-1 text-xs text-muted">
                                  <Eye size={11} /> {formatNumber(product.viewCount)}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted">
                                  <ShoppingBag size={11} /> {product.orderCount}
                                </span>
                                <span className={cn(
                                  'text-xs font-bold px-2 py-0.5 rounded-full',
                                  product.conversion >= 3 ? 'bg-emerald-50 text-emerald-600'
                                    : product.conversion >= 1 ? 'bg-amber-50 text-amber-600'
                                    : 'bg-slate-50 text-slate-500'
                                )}>
                                  {product.conversion}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Conversion Rate Detail */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-amber-900 mb-1">Taux de conversion global</p>
                      <p className="text-xs text-amber-700">
                        {analyticsData.summary.totalOrders} commandes pour {formatNumber(analyticsData.summary.totalViews)} vues sur tous vos produits
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-3xl font-black text-amber-600">{analyticsData.summary.conversionRate}%</span>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {analyticsData.summary.conversionRate >= 3 ? '🔥 Excellent' : analyticsData.summary.conversionRate >= 1 ? '📈 Bon' : '💡 À améliorer'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-amber-200/50 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
                      style={{ width: `${Math.min(analyticsData.summary.conversionRate * 10, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-amber-600/70 mt-1.5">Référence : 3–5% = excellent pour un marketplace e-commerce</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* PRODUCTS */}
        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted">{products.length} annonce{products.length > 1 ? 's' : ''}</p>
              <Link href="/products/create" className="btn-primary btn-sm gap-1">
                <Plus size={14} /> Ajouter
              </Link>
            </div>

            {productsLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <Package size={40} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark mb-1">Aucune annonce</p>
                <p className="text-muted text-sm mb-4">Publiez votre première annonce pour commencer à vendre.</p>
                <Link href="/products/create" className="btn-primary btn-sm">Créer une annonce</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product: any) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-4 border border-border/50 shadow-card flex gap-4"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface border border-border flex-shrink-0">
                      {product.images?.[0]?.url ? (
                        <Image src={product.images[0].url} alt={product.title} width={64} height={64} className="object-cover w-full h-full" placeholder="blur" blurDataURL={imgBlurDataURL} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-muted" /></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-dark text-sm truncate">{product.title}</h3>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="font-bold text-primary text-sm">{formatPrice(product.price)}</span>
                            <span className="flex items-center gap-1 text-xs text-muted">
                              <Eye size={11} /> {product.viewCount || 0} vues
                            </span>
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                          product.status === 'ACTIVE' ? 'bg-success/10 text-success' : product.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' : 'bg-muted/10 text-muted'
                        )}>
                          {product.status === 'ACTIVE' ? 'Actif' : product.status === 'PENDING_REVIEW' ? 'En révision' : 'Inactif'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => toggleProductMutation.mutate({
                            id: product.id,
                            status: product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
                          })}
                          className="flex items-center gap-1 text-xs text-muted hover:text-dark transition-colors"
                        >
                          {product.status === 'ACTIVE'
                            ? <ToggleRight size={15} className="text-success" />
                            : <ToggleLeft size={15} />}
                          {product.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                        </button>
                        <span className="text-border">|</span>
                        <Link href={`/products/edit/${product.id}`} className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors">
                          <Edit3 size={13} /> Modifier
                        </Link>
                        <span className="text-border">|</span>
                        {confirmDeleteId === product.id ? (
                          <>
                            <button
                              onClick={() => { deleteProductMutation.mutate(product.id); setConfirmDeleteId(null) }}
                              className="text-xs text-danger font-semibold hover:underline"
                            >
                              Confirmer
                            </button>
                            <span className="text-border">|</span>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-muted hover:text-dark">
                              Annuler
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(product.id)}
                            className="flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
                          >
                            <Trash2 size={13} /> Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ORDERS RECEIVED */}
        {activeTab === 'orders' && (
          <div>
            {/* Status filter tabs */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {[
                { key: 'ALL',               label: 'Toutes',             dot: '' },
                { key: 'PENDING',           label: 'En attente',         dot: 'bg-amber-400' },
                { key: 'PAYMENT_CONFIRMED', label: 'Paiement confirmé',  dot: 'bg-blue-400' },
                { key: 'PROCESSING',        label: 'En préparation',     dot: 'bg-purple-400' },
                { key: 'SHIPPED',           label: 'Expédié',            dot: 'bg-indigo-400' },
                { key: 'DELIVERED',         label: 'Livré',              dot: 'bg-green-400' },
                { key: 'COMPLETED',         label: 'Terminé',            dot: 'bg-emerald-400' },
                { key: 'CANCELLED',         label: 'Annulé',             dot: 'bg-red-400' },
                { key: 'DISPUTED',          label: 'Litige',             dot: 'bg-orange-400' },
              ].map((f) => {
                const count = f.key !== 'ALL' ? orders.filter((o: any) => o.status === f.key).length : 0
                const isActive = orderStatusFilter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setOrderStatusFilter(f.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      isActive
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-muted border-border hover:border-primary hover:text-primary'
                    )}
                  >
                    {f.dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', f.dot, isActive && 'bg-white/70')} />}
                    {f.label}
                    {count > 0 && (
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none', isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary')}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {ordersLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : orders.filter((o: any) => orderStatusFilter === 'ALL' || o.status === orderStatusFilter).length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <ShoppingBag size={40} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark mb-1">
                  {orderStatusFilter === 'DISPUTED' ? 'Aucun litige en cours' : orderStatusFilter !== 'ALL' ? 'Aucune commande avec ce statut' : 'Aucune commande reçue'}
                </p>
                <p className="text-muted text-sm">
                  {orderStatusFilter === 'DISPUTED' ? 'Les litiges ouverts par vos acheteurs apparaîtront ici.' : 'Les commandes de vos acheteurs apparaîtront ici.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.filter((o: any) => orderStatusFilter === 'ALL' || o.status === orderStatusFilter).map((order: any) => (
                  <div key={order.id} className="bg-white rounded-2xl p-4 border border-border/50 shadow-card">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs text-muted">#{order.orderNumber || order.id?.slice(0, 8)}</p>
                        <p className="text-xs text-muted">{timeAgo(order.createdAt)}</p>
                      </div>
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600')}>
                        {getStatusLabel(order.status).label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                        {order.buyer?.firstName?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark">{order.buyer?.firstName} {order.buyer?.lastName}</p>
                        <p className="text-xs text-muted">{order.buyer?.email}</p>
                      </div>
                      <div className="ml-auto font-bold text-dark">{formatPrice(order.totalAmount)}</div>
                    </div>

                    {/* Order status actions */}
                    {order.status === 'PAYMENT_CONFIRMED' && (
                      <button
                        onClick={() => updateOrderMutation.mutate({ id: order.id, status: 'PROCESSING' })}
                        className="btn-primary btn-sm gap-1 text-xs"
                      >
                        <Package size={13} /> Commencer la préparation
                      </button>
                    )}
                    {order.status === 'PROCESSING' && (
                      <button
                        onClick={() => updateOrderMutation.mutate({ id: order.id, status: 'SHIPPED' })}
                        className="btn-primary btn-sm gap-1 text-xs"
                      >
                        <CheckCircle size={13} /> Marquer comme expédié
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REVIEWS */}
        {activeTab === 'reviews' && (
          <div>
            {reviewsLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : reviews.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <Star size={40} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark mb-1">Aucun avis reçu</p>
                <p className="text-muted text-sm">Les avis de vos acheteurs apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <div key={review.id} className="bg-white rounded-2xl p-4 border border-border/50 shadow-card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                          {review.buyer?.firstName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-dark">{review.buyer?.firstName} {review.buyer?.lastName?.[0]}.</p>
                          <div className="flex">
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} size={11} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted">{timeAgo(review.createdAt)}</span>
                    </div>
                    {review.comment && <p className="text-sm text-dark">{review.comment}</p>}
                    {!review.sellerReply && (
                      replyingTo === review.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Votre réponse..."
                            rows={3}
                            className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => replyMutation.mutate({ reviewId: review.id, reply: replyText })}
                              disabled={!replyText.trim() || replyMutation.isPending}
                              className="btn-primary btn-sm text-xs gap-1 flex items-center"
                            >
                              {replyMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                              Publier
                            </button>
                            <button
                              onClick={() => { setReplyingTo(null); setReplyText('') }}
                              className="text-xs border border-border text-muted hover:text-dark rounded-xl px-3 py-1.5 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setReplyingTo(review.id)} className="mt-2 text-xs text-primary hover:underline">
                          Répondre à cet avis
                        </button>
                      )
                    )}
                    {review.sellerReply && (
                      <div className="mt-2 ml-3 pl-3 border-l-2 border-primary/30">
                        <p className="text-xs text-muted">Votre réponse :</p>
                        <p className="text-sm text-dark">{review.sellerReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
