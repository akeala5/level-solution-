'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Star, MapPin, Shield, Zap, Package, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { Product } from '@/types'
import { cn, formatPrice, getConditionLabel, timeAgo } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useState } from 'react'

interface Props {
  product: Product
  onFavoriteToggle?: (id: string, isFav: boolean) => void
}

export default function ProductCard({ product, onFavoriteToggle }: Props) {
  const { isAuthenticated } = useAuthStore()
  const [isFav, setIsFav] = useState(product.isFavorite || false)
  const [loadingFav, setLoadingFav] = useState(false)
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/products/${product.slug}`} className="card-hover group block">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-surface overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              className="product-img"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={48} className="text-border" />
            </div>
          )}

          {/* Badges top left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            {product.isFeatured && (
              <span className="badge bg-accent text-white text-[10px] px-2 py-0.5">
                <Zap size={9} className="mr-0.5" /> Mis en avant
              </span>
            )}
            {product.isReconditioned && (
              <span className="badge bg-primary text-white text-[10px] px-2 py-0.5">
                <Shield size={9} className="mr-0.5" /> Reconditionné LS
              </span>
            )}
            {discount && (
              <span className="badge bg-danger text-white text-[10px] px-2 py-0.5">
                -{discount}%
              </span>
            )}
          </div>

          {/* Condition badge */}
          <div className="absolute top-2 right-10">
            <span className={cn('badge text-[10px] px-2 py-0.5', `badge-${condition.color}`)}>
              {condition.label}
            </span>
          </div>

          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            disabled={loadingFav}
            className={cn(
              'absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all',
              isFav
                ? 'bg-red-50 text-danger shadow-sm'
                : 'bg-white/80 text-muted hover:bg-white hover:text-danger shadow-sm'
            )}
          >
            <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />
          </button>

          {/* Overlay stats */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-white text-xs">
              <Eye size={12} />
              <span>{product.viewCount} vues</span>
              <Heart size={12} className="ml-auto" />
              <span>{product.favoriteCount}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Category */}
          <div className="text-xs text-muted mb-1 truncate">{product.category?.name}</div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-dark leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            {product.isNegotiable && (
              <span className="text-[10px] text-accent font-medium">Négociable</span>
            )}
          </div>

          {/* Seller info */}
          <div className="flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold text-[9px] shrink-0">
                {product.seller?.firstName?.[0]}
              </div>
              <span className="truncate">
                {product.seller?.sellerProfile?.shopName || product.seller?.firstName}
              </span>
              {product.seller?.isKycVerified && (
                <Shield size={10} className="text-success shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {product.seller?.sellerProfile?.avgRating ? (
                <>
                  <Star size={10} fill="currentColor" className="text-warning" />
                  <span>{product.seller.sellerProfile.avgRating.toFixed(1)}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Location & delivery */}
          <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted">
            {product.city && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {product.city}
              </span>
            )}
            {product.hasDelivery && (
              <span className="text-success font-medium">Livraison dispo</span>
            )}
          </div>

          {/* Time */}
          <div className="text-[10px] text-muted/70 mt-1.5 text-right">
            {timeAgo(product.createdAt)}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
