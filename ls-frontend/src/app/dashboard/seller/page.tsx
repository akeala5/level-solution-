'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package, TrendingUp, DollarSign, Eye, Plus, Edit3,
  Trash2, ToggleLeft, ToggleRight, Star, Users, Clock,
  CheckCircle, Loader2, AlertCircle, BarChart3, ShoppingBag, Award
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, formatNumber, timeAgo, getStatusLabel, cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'products', label: 'Mes annonces', icon: Package },
  { id: 'orders', label: 'Commandes reçues', icon: ShoppingBag },
  { id: 'reviews', label: 'Avis reçus', icon: Star },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')

  if (!isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ['seller-stats'],
    queryFn: () => api.get('/users/me/seller-stats').then((r) => r.data.data),
  })

  // Products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => api.get('/products/my').then((r) => r.data.data),
    enabled: activeTab === 'products' || activeTab === 'overview',
  })

  // Orders received
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => api.get('/orders/seller').then((r) => r.data.data),
    enabled: activeTab === 'orders',
  })

  // Reviews received
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['seller-reviews'],
    queryFn: () => api.get('/reviews/seller').then((r) => r.data.data),
    enabled: activeTab === 'reviews',
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
      value: formatNumber(products.filter((p: any) => p.status === 'PUBLISHED').length),
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
          <Link href="/products/create" className="btn-primary btn-sm gap-2">
            <Plus size={15} /> Nouvelle annonce
          </Link>
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
                      <Image src={product.images[0].url} alt={product.title} width={40} height={40} className="object-cover w-full h-full" />
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
                    product.status === 'PUBLISHED' ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
                  )}>
                    {product.status === 'PUBLISHED' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              ))}
              {products.length === 0 && (
                <div className="text-center py-10 text-muted text-sm">Aucune annonce publiée</div>
              )}
            </div>
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
                        <Image src={product.images[0].url} alt={product.title} width={64} height={64} className="object-cover w-full h-full" />
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
                          product.status === 'PUBLISHED' ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
                        )}>
                          {product.status === 'PUBLISHED' ? 'Actif' : 'Inactif'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => toggleProductMutation.mutate({
                            id: product.id,
                            status: product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
                          })}
                          className="flex items-center gap-1 text-xs text-muted hover:text-dark transition-colors"
                        >
                          {product.status === 'PUBLISHED'
                            ? <ToggleRight size={15} className="text-success" />
                            : <ToggleLeft size={15} />}
                          {product.status === 'PUBLISHED' ? 'Désactiver' : 'Activer'}
                        </button>
                        <span className="text-border">|</span>
                        <Link href={`/products/edit/${product.id}`} className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors">
                          <Edit3 size={13} /> Modifier
                        </Link>
                        <span className="text-border">|</span>
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cette annonce ?')) {
                              deleteProductMutation.mutate(product.id)
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
                        >
                          <Trash2 size={13} /> Supprimer
                        </button>
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
            {ordersLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <ShoppingBag size={40} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark mb-1">Aucune commande reçue</p>
                <p className="text-muted text-sm">Les commandes de vos acheteurs apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
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
                      <button className="mt-2 text-xs text-primary hover:underline">Répondre à cet avis</button>
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
