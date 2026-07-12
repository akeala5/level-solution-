'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ShoppingBag, Heart, MessageSquare, Star, Package,
  ChevronRight, Loader2, Clock, CheckCircle, Truck,
  XCircle, AlertCircle, Eye, User, Award, Users
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, timeAgo, getStatusLabel, cn } from '@/lib/utils'
import api from '@/lib/api'

const STATUS_ICONS: Record<string, any> = {
  PENDING: Clock,
  PAYMENT_CONFIRMED: CheckCircle,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle,
  COMPLETED: Award,
  CANCELLED: XCircle,
  DISPUTED: AlertCircle,
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  DISPUTED: 'bg-orange-100 text-orange-700',
}

const TABS = [
  { id: 'orders', label: 'Mes commandes', icon: ShoppingBag },
  { id: 'favorites', label: 'Favoris', icon: Heart },
  { id: 'reviews', label: 'Mes avis', icon: Star },
]

export default function BuyerDashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [activeTab, setActiveTab] = useState('orders')
  const [orderFilter, setOrderFilter] = useState('')

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/auth/login')
  }, [_hasHydrated, isAuthenticated, router])

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/buying').then((r) => r.data.data),
    enabled: isAuthenticated && activeTab === 'orders',
  })

  const { data: favData, isLoading: favLoading } = useQuery({
    queryKey: ['my-favorites'],
    queryFn: () => api.get('/users/me/favorites').then((r) => r.data.data),
    enabled: isAuthenticated && activeTab === 'favorites',
  })

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get('/reviews/my').then((r) => r.data.data as any[]),
    enabled: isAuthenticated && activeTab === 'reviews',
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const orders = ordersData?.orders || ordersData || []
  const filteredOrders = orderFilter
    ? orders.filter((o: any) => o.status === orderFilter)
    : orders

  const stats = [
    { label: 'Commandes', value: orders.length, icon: ShoppingBag, color: 'text-primary' },
    { label: 'En cours', value: orders.filter((o: any) => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(o.status)).length, icon: Clock, color: 'text-amber-500' },
    { label: 'Livré', value: orders.filter((o: any) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length, icon: CheckCircle, color: 'text-success' },
    { label: 'Favoris', value: favData?.length || 0, icon: Heart, color: 'text-danger' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="heading-sm text-dark">Bonjour, {user?.firstName} 👋</h1>
            <p className="text-muted text-sm">Gérez vos achats et votre activité</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/referrals" className="flex items-center gap-2 btn-outline btn-sm text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              <Users size={15} /> Parrainage
            </Link>
            <Link href="/profile" className="flex items-center gap-2 btn-outline btn-sm">
              <User size={15} /> Mon profil
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-border/50 shadow-card">
              <div className={cn('mb-2', stat.color)}>
                <stat.icon size={20} />
              </div>
              <div className="text-2xl font-black text-dark">{stat.value}</div>
              <div className="text-xs text-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border/50 rounded-2xl p-1 mb-5 shadow-card w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-dark hover:bg-surface'
              )}
            >
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <div>
            {/* Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: '',                 label: 'Toutes' },
                { key: 'PENDING',          label: 'En attente' },
                { key: 'PROCESSING',       label: 'En préparation' },
                { key: 'SHIPPED',          label: 'Expédié' },
                { key: 'DELIVERED',        label: 'Livré' },
                { key: 'COMPLETED',        label: 'Terminé' },
                { key: 'CANCELLED',        label: 'Annulé' },
                { key: 'DISPUTED',         label: 'Litige' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setOrderFilter(key)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition-all',
                    orderFilter === key
                      ? key === 'DISPUTED'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-primary text-white border-primary'
                      : key === 'DISPUTED'
                        ? 'border-orange-200 text-orange-600 hover:border-orange-400'
                        : 'border-border text-muted hover:border-primary/40 hover:text-dark'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {ordersLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <ShoppingBag size={40} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark mb-1">Aucune commande</p>
                <p className="text-muted text-sm mb-4">Vous n'avez pas encore passé de commande.</p>
                <Link href="/products" className="btn-primary btn-sm">Voir les annonces</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order: any) => {
                  const StatusIcon = STATUS_ICONS[order.status] || Package
                  const statusStyle = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-4 border border-border/50 shadow-card"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted">Commande #{order.orderNumber || order.id?.slice(0, 8)}</p>
                          <p className="text-xs text-muted">{timeAgo(order.createdAt)}</p>
                        </div>
                        <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full', statusStyle)}>
                          <StatusIcon size={12} /> {getStatusLabel(order.status).label}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-2 mb-3">
                        {order.items?.slice(0, 2).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface border border-border flex-shrink-0">
                              {item.product?.images?.[0]?.url ? (
                                <Image src={item.product.images[0].url} alt={item.product.title} width={48} height={48} className="object-cover w-full h-full" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-muted" /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-dark truncate">{item.product?.title}</p>
                              <p className="text-xs text-muted">x{item.quantity} — {formatPrice(item.unitPrice)}</p>
                            </div>
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <p className="text-xs text-muted pl-1">+{order.items.length - 2} article(s) de plus</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="font-bold text-dark">{formatPrice(order.totalAmount)}</span>
                        <div className="flex items-center gap-2">
                          {order.status === 'DELIVERED' && (
                            <Link href={`/review/${order.id}`} className="btn-sm btn-outline text-xs gap-1">
                              <Star size={13} /> Donner un avis
                            </Link>
                          )}
                          <Link href={`/orders/${order.id}`} className="btn-sm btn-primary text-xs gap-1">
                            <Eye size={13} /> Détails
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* FAVORITES */}
        {activeTab === 'favorites' && (
          <div>
            {favLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : !favData?.length ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <Heart size={40} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark mb-1">Aucun favori</p>
                <p className="text-muted text-sm mb-4">Cliquez sur ❤️ sur une annonce pour l'ajouter.</p>
                <Link href="/products" className="btn-primary btn-sm">Parcourir les annonces</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {favData.map((fav: any) => {
                  const product = fav.product || fav
                  return (
                    <Link key={fav.id} href={`/products/${product.slug}`} className="bg-white rounded-2xl border border-border/50 shadow-card hover:shadow-card-hover transition-shadow overflow-hidden group">
                      <div className="aspect-square bg-surface overflow-hidden">
                        {product.images?.[0]?.url ? (
                          <Image src={product.images[0].url} alt={product.title} width={200} height={200} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-muted" /></div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-dark truncate">{product.title}</p>
                        <p className="text-primary font-bold text-sm mt-1">{formatPrice(product.price)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* REVIEWS */}
        {activeTab === 'reviews' && (
          <div>
            {reviewsLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : !reviewsData?.length ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <Star size={40} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark mb-1">Aucun avis</p>
                <p className="text-muted text-sm">Vos avis apparaîtront ici après vos achats.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviewsData.map((review: any) => (
                  <div key={review.id} className="bg-white rounded-2xl p-4 border border-border/50 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} size={14} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'} />
                          ))}
                        </div>
                        <span className="text-xs text-muted">{timeAgo(review.createdAt)}</span>
                      </div>
                      {review.product && (
                        <Link href={`/products/${review.product.slug}`} className="text-xs text-primary hover:underline truncate max-w-[160px]">
                          {review.product.title}
                        </Link>
                      )}
                    </div>
                    {review.comment && <p className="text-sm text-dark mt-2">{review.comment}</p>}
                    {review.sellerReply && (
                      <div className="mt-2 ml-3 pl-3 border-l-2 border-primary/30">
                        <p className="text-xs text-muted">Réponse du vendeur :</p>
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
