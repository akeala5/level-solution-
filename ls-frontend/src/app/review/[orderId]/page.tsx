'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Star, Loader2, ArrowLeft, CheckCircle, Package, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import { Order } from '@/types'
import { formatPrice, cn } from '@/lib/utils'
import api from '@/lib/api'

const RATING_LABELS = ['', 'Très mauvais', 'Mauvais', 'Moyen', 'Bien', 'Excellent']

const SUB_RATINGS = [
  { key: 'ratingProduct', label: 'Qualité du produit' },
  { key: 'ratingCommunication', label: 'Communication du vendeur' },
  { key: 'ratingDelivery', label: 'Rapidité de livraison' },
]

export default function ReviewPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [globalRating, setGlobalRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [subRatings, setSubRatings] = useState<Record<string, number>>({
    ratingProduct: 0,
    ratingCommunication: 0,
    ratingDelivery: 0,
  })
  const [comment, setComment] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-review', orderId],
    queryFn: () => api.get(`/orders/${orderId}`).then((r) => r.data.data as Order),
    enabled: !!orderId,
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/reviews', {
        orderId,
        productId: order?.items?.[0]?.productId,
        rating: globalRating,
        comment: comment.trim() || undefined,
        ratingProduct: subRatings.ratingProduct || undefined,
        ratingCommunication: subRatings.ratingCommunication || undefined,
        ratingDelivery: subRatings.ratingDelivery || undefined,
      }),
    onSuccess: () => setSuccess(true),
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis')
    },
  })

  const handleSubmit = () => {
    if (globalRating === 0) {
      toast.error('Veuillez sélectionner une note globale')
      return
    }
    submitMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (order?.review) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-card-hover">
          <CheckCircle size={40} className="text-success mx-auto mb-4" />
          <h2 className="font-bold text-dark text-lg mb-2">Avis déjà soumis</h2>
          <p className="text-muted text-sm mb-4">Vous avez déjà laissé un avis pour cette commande.</p>
          <Link href="/dashboard/buyer" className="btn-primary btn-sm">Mes commandes</Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-card-hover"
        >
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-success" />
          </div>
          <h1 className="heading-sm text-dark mb-2">Merci pour votre avis !</h1>
          <p className="text-muted text-sm mb-2">Votre avis aide la communauté LS à faire de meilleurs choix.</p>
          <div className="flex justify-center my-4">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} size={24} className={s <= globalRating ? 'fill-amber-400 text-amber-400' : 'text-border'} />
            ))}
          </div>
          <div className="space-y-2 mt-4">
            <Link href="/dashboard/buyer" className="btn-primary w-full justify-center">
              Mes commandes
            </Link>
            <Link href="/products" className="btn-outline w-full justify-center">
              Continuer mes achats
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  const product = order?.items?.[0]?.product
  const seller = order?.seller

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/orders/${orderId}`} className="w-9 h-9 border border-border rounded-xl flex items-center justify-center hover:bg-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="heading-sm text-dark">Laisser un avis</h1>
        </div>

        {/* Product recap */}
        {order && (
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-card mb-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface border border-border flex-shrink-0">
                {product?.images?.[0]?.url ? (
                  <Image src={product.images[0].url} alt={order.items[0]?.title} width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={20} className="text-muted" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-dark text-sm truncate">{order.items[0]?.title}</p>
                <p className="text-xs text-muted">Commandé le {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-primary font-bold text-sm mt-0.5">{formatPrice(order.totalAmount)}</p>
              </div>
              {seller && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted">Vendeur</p>
                  <p className="text-sm font-medium text-dark">{(seller as any).firstName} {(seller as any).lastName}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Global rating */}
          <div className="bg-white rounded-2xl p-6 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-1">Note globale *</h2>
            <p className="text-muted text-sm mb-4">Comment évaluez-vous votre expérience ?</p>

            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                {[1,2,3,4,5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoveredRating(s)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setGlobalRating(s)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={40}
                      className={cn(
                        'transition-colors',
                        s <= (hoveredRating || globalRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-border'
                      )}
                    />
                  </button>
                ))}
              </div>
              {(hoveredRating || globalRating) > 0 && (
                <motion.p
                  key={hoveredRating || globalRating}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-semibold text-dark"
                >
                  {RATING_LABELS[hoveredRating || globalRating]}
                </motion.p>
              )}
            </div>
          </div>

          {/* Sub ratings */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-4">Notes détaillées <span className="text-muted font-normal text-sm">(optionnel)</span></h2>
            <div className="space-y-4">
              {SUB_RATINGS.map((sub) => (
                <div key={sub.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm text-dark">{sub.label}</label>
                    {subRatings[sub.key] > 0 && (
                      <span className="text-xs text-muted">{RATING_LABELS[subRatings[sub.key]]}</span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSubRatings((prev) => ({ ...prev, [sub.key]: s }))}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={cn(
                            'transition-colors',
                            s <= subRatings[sub.key] ? 'fill-amber-400 text-amber-400' : 'text-border'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-1">Commentaire <span className="text-muted font-normal text-sm">(optionnel)</span></h2>
            <p className="text-muted text-sm mb-3">Partagez votre expérience en détail pour aider les autres acheteurs.</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Le produit était exactement comme décrit. Vendeur réactif et sérieux..."
              className="input resize-none w-full"
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-muted">{comment.length}/1000</span>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || globalRating === 0}
            className="btn-primary w-full justify-center btn-lg"
          >
            {submitMutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Send size={16} /> Publier mon avis
              </>
            )}
          </button>

          <p className="text-xs text-muted text-center pb-4">
            Votre avis sera visible par toute la communauté LS. Soyez honnête et respectueux.
          </p>
        </div>
      </div>
    </div>
  )
}
