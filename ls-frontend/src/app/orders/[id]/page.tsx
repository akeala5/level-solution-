'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle,
  AlertCircle, MapPin, Phone, CreditCard, Loader2,
  MessageSquare, Star, Shield, Copy, ExternalLink, Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import { Order } from '@/types'
import { formatPrice, timeAgo, getStatusLabel, cn } from '@/lib/utils'
import api from '@/lib/api'

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Commande passée', icon: Clock },
  { key: 'PAYMENT_CONFIRMED', label: 'Paiement confirmé', icon: CreditCard },
  { key: 'PROCESSING', label: 'En préparation', icon: Package },
  { key: 'SHIPPED', label: 'Expédié', icon: Truck },
  { key: 'DELIVERED', label: 'Livré', icon: CheckCircle },
  { key: 'COMPLETED', label: 'Terminé', icon: Award },
]

const STATUS_ORDER = ['PENDING', 'PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']

function getStepIndex(status: string) {
  const idx = STATUS_ORDER.indexOf(status)
  return idx >= 0 ? idx : 0
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data as Order),
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${id}/cancel`),
    onSuccess: () => toast.success('Commande annulée'),
    onError: (err: any) => toast.error(err.response?.data?.message || 'Impossible d\'annuler'),
  })

  const confirmDeliveryMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${id}/confirm-delivery`),
    onSuccess: () => {
      toast.success('Livraison confirmée ! Merci.')
      router.push(`/review/${id}`)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  })

  const copyTracking = () => {
    if (data?.trackingNumber) {
      navigator.clipboard.writeText(data.trackingNumber)
      toast.success('Numéro de suivi copié')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="text-muted mx-auto mb-3" />
          <p className="font-semibold text-dark mb-2">Commande introuvable</p>
          <Link href="/dashboard" className="btn-primary btn-sm">Mes commandes</Link>
        </div>
      </div>
    )
  }

  const order = data
  const isBuyer = order.buyerId === user?.id
  const isSeller = order.sellerId === user?.id
  const currentStep = getStepIndex(order.status)
  const isTerminal = ['COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED'].includes(order.status)

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-purple-100 text-purple-700',
    SHIPPED: 'bg-indigo-100 text-indigo-700',
    DELIVERED: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-orange-100 text-orange-700',
    DISPUTED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="w-9 h-9 border border-border rounded-xl flex items-center justify-center hover:bg-white transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="heading-sm text-dark">Commande #{order.orderNumber || order.id.slice(0, 8)}</h1>
            <p className="text-muted text-sm">{timeAgo(order.createdAt)}</p>
          </div>
          <span className={cn('ml-auto text-xs font-semibold px-3 py-1.5 rounded-full', STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600')}>
            {getStatusLabel(order.status).label}
          </span>
        </div>

        {/* Progress tracker (not for cancelled/disputed) */}
        {!['CANCELLED', 'REFUNDED', 'DISPUTED'].includes(order.status) && (
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card mb-5">
            <div className="flex items-center justify-between relative">
              {/* Line */}
              <div className="absolute left-0 right-0 top-5 h-0.5 bg-border mx-8" />
              <div
                className="absolute left-0 top-5 h-0.5 bg-primary mx-8 transition-all duration-500"
                style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
              />
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentStep
                const active = idx === currentStep
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      done ? 'bg-primary border-primary text-white' : 'bg-white border-border text-muted'
                    )}>
                      <step.icon size={16} />
                    </div>
                    <span className={cn('text-xs text-center max-w-[60px] leading-tight', active ? 'text-primary font-semibold' : done ? 'text-dark' : 'text-muted')}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Order items */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-4">Articles commandés</h2>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface border border-border flex-shrink-0">
                    {item.product?.images?.[0]?.url || item.imageUrl ? (
                      <Image
                        src={item.product?.images?.[0]?.url || item.imageUrl!}
                        alt={item.title}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={18} className="text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted">x{item.quantity} — {formatPrice(item.price)} / unité</p>
                  </div>
                  <span className="font-bold text-dark text-sm">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border mt-4 pt-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Sous-total</span>
                <span>{formatPrice(order.totalAmount - order.deliveryAmount)}</span>
              </div>
              {order.deliveryAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Livraison</span>
                  <span>{formatPrice(order.deliveryAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted">Commission LS</span>
                <span>{formatPrice(order.commissionAmount)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-border">
                <span className="text-dark">Total</span>
                <span className="text-primary text-lg">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
              <h2 className="font-bold text-dark mb-3 flex items-center gap-2">
                <Truck size={17} className="text-primary" /> Suivi de livraison
              </h2>
              <div className="flex items-center gap-3 bg-surface rounded-xl p-3">
                <span className="font-mono text-sm text-dark flex-1">{order.trackingNumber}</span>
                <button onClick={copyTracking} className="text-muted hover:text-primary transition-colors">
                  <Copy size={15} />
                </button>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-colors">
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Payment */}
          {order.payment && (
            <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
              <h2 className="font-bold text-dark mb-3 flex items-center gap-2">
                <CreditCard size={17} className="text-primary" /> Paiement
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted text-xs">Méthode</span>
                  <p className="font-medium text-dark">{order.payment.method}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">Statut</span>
                  <p className="font-medium text-dark">{order.payment.status}</p>
                </div>
                {order.payment.providerRef && (
                  <div className="col-span-2">
                    <span className="text-muted text-xs">Référence</span>
                    <p className="font-mono text-sm text-dark">{order.payment.providerRef}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
              <h2 className="font-bold text-dark mb-2">Notes</h2>
              <p className="text-sm text-dark">{order.notes}</p>
            </div>
          )}

          {/* Parties */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-4">Parties</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Acheteur', person: order.buyer },
                { label: 'Vendeur', person: order.seller },
              ].map(({ label, person }) => person && (
                <div key={label} className="flex items-center gap-3 p-3 bg-surface rounded-xl">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {(person as any).firstName?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{label}</p>
                    <p className="font-semibold text-dark text-sm truncate">
                      {(person as any).firstName} {(person as any).lastName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-4">Actions</h2>
            <div className="flex flex-wrap gap-3">
              {/* Contact the other party */}
              <Link
                href={`/chat?seller=${isBuyer ? order.sellerId : order.buyerId}&order=${order.id}`}
                className="btn-outline btn-sm gap-2"
              >
                <MessageSquare size={15} /> Contacter {isBuyer ? 'le vendeur' : 'l\'acheteur'}
              </Link>

              {/* Confirm delivery (buyer only, when shipped) */}
              {isBuyer && order.status === 'SHIPPED' && (
                <button
                  onClick={() => confirmDeliveryMutation.mutate()}
                  disabled={confirmDeliveryMutation.isPending}
                  className="btn-primary btn-sm gap-2"
                >
                  {confirmDeliveryMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle size={15} />
                  )}
                  Confirmer la réception
                </button>
              )}

              {/* Leave review */}
              {isBuyer && ['DELIVERED', 'COMPLETED'].includes(order.status) && !order.review && (
                <Link href={`/review/${order.id}`} className="btn-primary btn-sm gap-2">
                  <Star size={15} /> Laisser un avis
                </Link>
              )}

              {/* Cancel (buyer, only if PENDING) */}
              {isBuyer && order.status === 'PENDING' && (
                <button
                  onClick={() => {
                    if (confirm('Annuler cette commande ?')) cancelMutation.mutate()
                  }}
                  disabled={cancelMutation.isPending}
                  className="btn-sm border border-danger/30 text-danger hover:bg-danger/10 rounded-xl px-4 py-2 text-sm font-medium transition-colors gap-2 flex items-center"
                >
                  {cancelMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                  Annuler la commande
                </button>
              )}

              {/* Dispute */}
              {isBuyer && ['DELIVERED'].includes(order.status) && (
                <button
                  onClick={() => toast('Ouverture d\'un litige — bientôt disponible', { icon: '⚠️' })}
                  className="btn-sm border border-orange-300 text-orange-600 hover:bg-orange-50 rounded-xl px-4 py-2 text-sm font-medium transition-colors gap-2 flex items-center"
                >
                  <AlertCircle size={15} /> Ouvrir un litige
                </button>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-muted bg-surface rounded-xl p-3">
              <Shield size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <span>Protection acheteur LS active — votre paiement est sécurisé jusqu'à confirmation de la livraison.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
