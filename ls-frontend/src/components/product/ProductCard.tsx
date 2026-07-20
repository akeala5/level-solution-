'use client'
import Link from 'next/link'
import ProductImage from './ProductImage'
import { Heart, Star, MapPin, Shield, Zap, Package, Eye, ShoppingCart, MessageSquare, Truck, RefreshCw, BadgeCheck, GitCompare, Flame, Clock, Layers } from 'lucide-react'
import { Product } from '@/types'
import { cn, formatPrice, getConditionLabel, timeAgo, imgBlurDataURL } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useCompareStore } from '@/store/compare.store'
import { useCountdown } from '@/hooks/useCountdown'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useState } from 'react'

function FlashBadge({ flashEndsAt }: { flashEndsAt: string }) {
  const { formatted, isExpired, urgency } = useCountdown(flashEndsAt)
  if (isExpired) return null
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-bold',
      urgency === 'critical' ? 'bg-red-500 text-white border-red-500' : 'bg-red-50 text-red-700 border-red-200'
    )}>
      <Flame size={8} /> FLASH <Clock size={7} /> {formatted}
    </span>
  )
}

interface Props {
  product: Product
  onFavoriteToggle?: (id: string, isFav: boolean) => void
}

export default function ProductCard({ product, onFavoriteToggle }: Props) {
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const { addItem: addToCompare, removeItem: removeFromCompare, isInCompare, items: compareItems } = useCompareStore()
  const [isFav, setIsFav] = useState(product.isFavorite || false)
  const [loadingFav, setLoadingFav] = useState(false)

  const inCompare = isInCompare(product.id)
  const compareDisabled = !inCompare && compareItems.length >= 4

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inCompare) { removeFromCompare(product.id); return }
    if (compareDisabled) { toast('Maximum 4 produits comparables', { icon: '⚠️' }); return }
    addToCompare(product)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: product.images?.[0]?.url,
      hasDelivery: product.hasDelivery || false,
      deliveryPrice: product.deliveryPrice,
      sellerId: product.seller?.id || '',
      sellerName: product.seller?.sellerProfile?.shopName || product.seller?.firstName || '',
    })
    toast.success('Ajouté au panier')
  }

  const condition = getConditionLabel(product.condition)
  const image = product.images?.[0]?.url || product.images?.[0]?.thumbnailUrl

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { toast.error('Connectez-vous pour ajouter aux favoris'); return }
    setLoadingFav(true)
    try {
      await api.post(`/users/me/favorites/${product.id}`)
      setIsFav(!isFav)
      onFavoriteToggle?.(product.id, !isFav)
    } catch {
      toast.error('Erreur')
    } finally {
      setLoadingFav(false)
    }
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null

  return (
    <div className="group">
      <Link
        href={`/products/${product.slug}`}
        className="block bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-border"
      >
        {/* ── Image 100% propre — aucun élément flottant ── */}
        <div className="relative aspect-[4/3] bg-surface overflow-hidden">
          {image ? (
            <ProductImage
              src={image}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              placeholder="blur"
              blurDataURL={imgBlurDataURL}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={36} className="text-muted" />
            </div>
          )}

          {/* Hover actions — apparition en fondu (opacité), sans mouvement ni gradient */}
          <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-1.5 bg-card text-dark text-xs font-semibold py-1.5 rounded-xl hover:bg-accent hover:text-white transition-colors shadow-sm"
              >
                <ShoppingCart size={11} /> Ajouter
              </button>
              <Link
                href={`/chat?seller=${product.seller?.id}&product=${product.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center bg-white/25 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-xl hover:bg-white/40 transition-colors border border-white/30"
              >
                <MessageSquare size={11} />
              </Link>
              <div className="ml-auto flex items-center gap-1 text-white/80 text-[10px] bg-black/30 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                <Eye size={9} /> {product.viewCount || 0}
              </div>
            </div>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="p-3.5">

          {/* Ligne badges + favori (hors image, aucun risque de chevauchement) */}
          <div className="flex items-center gap-1 flex-wrap mb-2">
            {/* Badges produit */}
            {product.isFeatured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-amber-50 text-amber-700 border-amber-200">
                <Zap size={8} /> Sponsorisé
              </span>
            )}
            {product.isReconditioned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-accent/10 text-accent border-accent/20">
                <RefreshCw size={8} /> Reconditionné
              </span>
            )}
            {product.isFlash && product.flashEndsAt && (
              <FlashBadge flashEndsAt={product.flashEndsAt} />
            )}
            {product.isBundle && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-violet-50 text-violet-700 border-violet-200">
                <Layers size={8} /> Lot
              </span>
            )}
            {product.seller?.isKycVerified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                <BadgeCheck size={8} /> Vérifié
              </span>
            )}
            {discount && (
              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-bold bg-rose-50 text-rose-700 border-rose-200">
                -{discount}%
              </span>
            )}

            {/* Condition + favori poussés à droite */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', `badge-${condition.color}`)}>
                {condition.label}
              </span>
              <button
                onClick={handleCompare}
                title={inCompare ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-colors border',
                  inCompare
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : compareDisabled
                    ? 'bg-surface text-muted/60 border-border cursor-not-allowed'
                    : 'bg-surface text-muted border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                )}
              >
                <GitCompare size={10} />
              </button>
              <button
                onClick={handleFavorite}
                disabled={loadingFav}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-colors border',
                  isFav
                    ? 'bg-rose-50 text-rose-500 border-rose-200'
                    : 'bg-surface text-muted border-border hover:bg-rose-50 hover:text-rose-400 hover:border-rose-200'
                )}
              >
                <Heart size={11} fill={isFav ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Titre */}
          <h3 className="text-sm font-semibold text-dark leading-snug line-clamp-2 mb-2 group-hover:text-accent transition-colors">
            {product.title}
          </h3>

          {/* Prix */}
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="text-base font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            {product.isNegotiable && (
              <span className="ml-auto text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                Négo.
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border mb-2" />

          {/* Vendeur */}
          <div className="flex items-center justify-between text-[11px] text-muted">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-accent/12 flex items-center justify-center text-accent font-bold text-[9px] shrink-0">
                {product.seller?.firstName?.[0]?.toUpperCase()}
              </div>
              <span className="truncate font-medium text-dark">
                {product.seller?.sellerProfile?.shopName || product.seller?.firstName}
              </span>
              {product.seller?.isKycVerified && (
                <span title="Vendeur KYC vérifié" className="shrink-0">
                  <BadgeCheck size={11} className="text-emerald-500" />
                </span>
              )}
            </div>
            {product.seller?.sellerProfile?.avgRating ? (
              <span className="flex items-center gap-0.5 shrink-0">
                <Star size={9} fill="currentColor" className="text-amber-400" />
                {product.seller.sellerProfile.avgRating.toFixed(1)}
              </span>
            ) : null}
          </div>

          {/* Ville + livraison */}
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted">
            {product.city && (
              <span className="flex items-center gap-1"><MapPin size={9} />{product.city}</span>
            )}
            {product.hasDelivery && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium"><Truck size={9} />Livraison</span>
            )}
          </div>

          <p className="text-[10px] text-muted mt-1 text-right">{timeAgo(product.createdAt)}</p>
        </div>
      </Link>
    </div>
  )
}
