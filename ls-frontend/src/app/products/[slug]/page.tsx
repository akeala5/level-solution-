'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Heart, Share2, Flag, ChevronLeft, ChevronRight, Star, MapPin, Package,
  Truck, Shield, MessageSquare, ShoppingCart, Zap, Check, ChevronDown,
  User, Calendar, Eye, Award, RefreshCw, Loader2, X, ZoomIn
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { Product, Review } from '@/types'
import { cn, formatPrice, timeAgo, getConditionLabel } from '@/lib/utils'
import ProductCard from '@/components/product/ProductCard'

const CONDITION_COLORS: Record<string, string> = {
  NEW: 'bg-emerald-100 text-emerald-700',
  VERY_GOOD: 'bg-blue-100 text-blue-700',
  GOOD: 'bg-sky-100 text-sky-700',
  FAIR: 'bg-amber-100 text-amber-700',
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()

  const [activeImg, setActiveImg] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then((r) => r.data.data as { product: Product; similar: Product[] }),
    enabled: !!slug,
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['product-reviews', slug],
    queryFn: () => api.get(`/reviews/product/${slug}`).then((r) => r.data.data as { reviews: Review[]; stats: any }),
    enabled: !!slug,
  })

  const favMutation = useMutation({
    mutationFn: () => api.post(`/users/me/favorites/${data?.product?.id}`),
    onSuccess: (res) => {
      setIsFav(res.data.data.isFavorite)
      toast.success(res.data.data.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris')
    },
    onError: () => {
      if (!isAuthenticated) { router.push('/auth/login'); return }
      toast.error('Erreur')
    },
  })

  const handleAddToCart = () => {
    if (!data?.product) return
    addItem({ id: data.product.id, title: data.product.title, price: data.product.price, image: data.product.images?.[0]?.url || '', sellerId: data.product.sellerId, slug: data.product.slug })
    toast.success('Ajouté au panier !')
  }

  const handleBuyNow = () => {
    if (!isAuthenticated) { router.push('/auth/login'); return }
    handleAddToCart()
    router.push('/checkout')
  }

  const handleContact = () => {
    if (!isAuthenticated) { router.push('/auth/login'); return }
    router.push(`/chat?seller=${data?.product?.seller?.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!data?.product) {
    return (
      <div className="container-custom py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="heading-sm text-dark mb-2">Annonce introuvable</h2>
        <p className="text-muted mb-6">Elle a peut-être été supprimée ou expirée.</p>
        <Link href="/products" className="btn-primary">Voir les annonces</Link>
      </div>
    )
  }

  const { product, similar } = data
  const images = product.images?.length ? product.images : [{ url: '/placeholder.jpg', id: '0' }]
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0

  return (
    <>
      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightbox(false)}
          >
            <button className="absolute top-4 right-4 text-white/70 hover:text-white">
              <X size={28} />
            </button>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
              onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p - 1 + images.length) % images.length) }}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="relative w-full max-w-3xl max-h-[80vh] mx-10" onClick={(e) => e.stopPropagation()}>
              <Image src={images[activeImg]?.url} alt={product.title} width={900} height={600} className="object-contain w-full h-full" />
            </div>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
              onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p + 1) % images.length) }}
            >
              <ChevronRight size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-surface min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-border">
          <div className="container-custom py-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Link href="/" className="hover:text-primary">Accueil</Link>
              <ChevronRight size={12} />
              <Link href="/products" className="hover:text-primary">Annonces</Link>
              {product.category && <>
                <ChevronRight size={12} />
                <Link href={`/products?categorySlug=${product.category.slug}`} className="hover:text-primary">{product.category.name}</Link>
              </>}
              <ChevronRight size={12} />
              <span className="text-dark truncate max-w-[200px]">{product.title}</span>
            </div>
          </div>
        </div>

        <div className="container-custom py-6">
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-5">
              {/* Image Gallery */}
              <div className="bg-white rounded-2xl overflow-hidden border border-border/50 shadow-card">
                {/* Main image */}
                <div className="relative aspect-[4/3] bg-surface cursor-zoom-in group" onClick={() => setLightbox(true)}>
                  <Image
                    src={images[activeImg]?.url || '/placeholder.jpg'}
                    alt={product.title}
                    fill
                    className="object-contain p-4"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center">
                    <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-all" />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {discount > 0 && <span className="badge bg-danger text-white text-xs font-bold px-2 py-0.5">-{discount}%</span>}
                    {product.isReconditioned && (
                      <span className="flex items-center gap-1 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        <RefreshCw size={10} /> Reconditionné LS ✓
                      </span>
                    )}
                  </div>

                  {/* Nav arrows */}
                  {images.length > 1 && <>
                    <button onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p - 1 + images.length) % images.length) }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 shadow rounded-full flex items-center justify-center hover:bg-white">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p + 1) % images.length) }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 shadow rounded-full flex items-center justify-center hover:bg-white">
                      <ChevronRight size={16} />
                    </button>
                  </>}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 p-3 border-t border-border overflow-x-auto">
                    {images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImg(i)}
                        className={cn('w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all', i === activeImg ? 'border-primary' : 'border-border hover:border-primary/40')}
                      >
                        <Image src={img.url} alt="" width={64} height={64} className="object-cover w-full h-full" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
                <h2 className="font-semibold text-dark mb-3">Description</h2>
                <div className={cn('text-sm text-dark leading-relaxed whitespace-pre-line', !showFullDesc && 'line-clamp-6')}>
                  {product.description || 'Aucune description fournie.'}
                </div>
                {product.description && product.description.length > 300 && (
                  <button onClick={() => setShowFullDesc(!showFullDesc)} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
                    {showFullDesc ? 'Voir moins' : 'Voir plus'} <ChevronDown size={12} className={cn('transition-transform', showFullDesc && 'rotate-180')} />
                  </button>
                )}

                {/* Tags */}
                {product.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                    {product.tags.map((tag: any) => (
                      <Link key={tag.id} href={`/products?search=${tag.name}`}
                        className="badge bg-surface text-muted hover:bg-primary/10 hover:text-primary text-xs transition-colors">
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviews */}
              <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-dark">Avis acheteurs</h2>
                  <span className="text-sm text-muted">{reviewsData?.stats?.total || 0} avis</span>
                </div>

                {reviewsData?.stats && (
                  <div className="flex items-center gap-4 mb-5 p-4 bg-surface rounded-xl">
                    <div className="text-center">
                      <div className="text-4xl font-black text-dark">{reviewsData.stats.average?.toFixed(1) || '—'}</div>
                      <div className="flex justify-center mt-1">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} size={14} className={s <= Math.round(reviewsData.stats.average) ? 'fill-amber-400 text-amber-400' : 'text-border'} />
                        ))}
                      </div>
                      <div className="text-xs text-muted mt-1">{reviewsData.stats.total} avis</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5,4,3,2,1].map((s) => {
                        const count = reviewsData.stats.distribution?.[s] || 0
                        const pct = reviewsData.stats.total ? (count / reviewsData.stats.total) * 100 : 0
                        return (
                          <div key={s} className="flex items-center gap-2 text-xs text-muted">
                            <span className="w-2">{s}</span>
                            <Star size={10} className="fill-amber-400 text-amber-400" />
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-6 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {reviewsData?.reviews?.length ? (
                  <div className="space-y-4">
                    {reviewsData.reviews.map((review: Review) => (
                      <div key={review.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                              {review.buyer?.profile?.firstName?.[0] || '?'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-dark">
                                {review.buyer?.profile?.firstName} {review.buyer?.profile?.lastName?.[0]}.
                              </div>
                              <div className="flex items-center gap-1.5">
                                {[1,2,3,4,5].map((s) => (
                                  <Star key={s} size={11} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted shrink-0">{timeAgo(review.createdAt)}</span>
                        </div>
                        {review.comment && <p className="mt-2 text-sm text-dark leading-relaxed">{review.comment}</p>}
                        {review.sellerReply && (
                          <div className="mt-2 ml-4 pl-3 border-l-2 border-primary/30">
                            <p className="text-xs text-muted mb-0.5">Réponse du vendeur :</p>
                            <p className="text-sm text-dark">{review.sellerReply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm text-center py-4">Aucun avis pour le moment</p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Main product info card */}
              <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card sticky top-24">
                {/* Title + actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-xl font-bold text-dark leading-tight">{product.title}</h1>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => favMutation.mutate()}
                      className={cn('w-9 h-9 rounded-xl border flex items-center justify-center transition-all', isFav ? 'bg-red-50 border-red-200 text-red-500' : 'border-border text-muted hover:border-red-200 hover:text-red-400')}
                    >
                      <Heart size={16} className={isFav ? 'fill-current' : ''} />
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Lien copié !') }}
                      className="w-9 h-9 rounded-xl border border-border text-muted hover:border-primary/40 hover:text-primary flex items-center justify-center transition-all"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Condition + views */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn('badge text-xs font-semibold px-2.5 py-1 rounded-lg', CONDITION_COLORS[product.condition] || 'bg-surface text-muted')}>
                    {getConditionLabel(product.condition)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Eye size={12} /> {product.viewCount || 0} vues
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Calendar size={12} /> {timeAgo(product.createdAt)}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-primary">{formatPrice(product.price)}</span>
                    {discount > 0 && (
                      <span className="text-muted line-through text-sm">{formatPrice(product.originalPrice!)}</span>
                    )}
                  </div>
                  {product.hasDelivery && (
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <Truck size={12} /> Livraison disponible
                    </p>
                  )}
                </div>

                {/* CTA Buttons */}
                <div className="space-y-2.5 mb-5">
                  <button onClick={handleBuyNow} className="btn-primary w-full justify-center btn-lg gap-2">
                    <Zap size={17} /> Acheter maintenant
                  </button>
                  <button onClick={handleAddToCart} className="btn-outline w-full justify-center gap-2">
                    <ShoppingCart size={16} /> Ajouter au panier
                  </button>
                  <button onClick={handleContact} className="btn-ghost w-full justify-center gap-2 text-primary border border-primary/20 hover:bg-primary/5">
                    <MessageSquare size={16} /> Contacter le vendeur
                  </button>
                </div>

                {/* Trust badges */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-dark">
                    <Shield size={14} className="text-blue-500 shrink-0" />
                    <span>Paiement sécurisé par Escrow — remboursé si non conforme</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-dark">
                    <Package size={14} className="text-emerald-500 shrink-0" />
                    <span>Protection acheteur LS incluse</span>
                  </div>
                  {product.isReconditioned && (
                    <div className="flex items-center gap-2 text-xs text-dark">
                      <Check size={14} className="text-accent shrink-0" />
                      <span>Certifié, testé et garanti par LS</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seller card */}
              {product.seller && (
                <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
                  <h3 className="font-semibold text-dark mb-3 text-sm">Vendeur</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                      {product.seller.profile?.firstName?.[0] || <User size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-dark text-sm truncate">
                          {product.seller.sellerProfile?.shopName || `${product.seller.profile?.firstName} ${product.seller.profile?.lastName}`}
                        </span>
                        {product.seller.isKycVerified && (
                          <Award size={14} className="text-blue-500 shrink-0" title="Vendeur KYC vérifié" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} size={11} className={s <= Math.round(product.seller.sellerProfile?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-border'} />
                          ))}
                        </div>
                        <span className="text-xs text-muted">({product.seller.sellerProfile?.totalReviews || 0})</span>
                      </div>
                    </div>
                  </div>

                  {product.seller.sellerProfile?.bio && (
                    <p className="text-xs text-muted mb-3 line-clamp-2">{product.seller.sellerProfile.bio}</p>
                  )}

                  {product.seller.profile?.city && (
                    <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
                      <MapPin size={12} />
                      <span>{product.seller.profile.city}, {product.seller.profile.country || 'Togo'}</span>
                    </div>
                  )}

                  <Link
                    href={`/shop/${product.seller.sellerProfile?.shopSlug || product.seller.id}`}
                    className="btn-outline w-full justify-center text-sm py-2"
                  >
                    Voir la boutique
                  </Link>
                </div>
              )}

              {/* Location */}
              {product.location && (
                <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-card">
                  <div className="flex items-center gap-2 text-sm text-dark">
                    <MapPin size={16} className="text-primary" />
                    <span>{product.location}</span>
                  </div>
                </div>
              )}

              {/* Report */}
              <button className="flex items-center gap-1.5 text-xs text-muted hover:text-danger transition-colors mx-auto">
                <Flag size={12} /> Signaler cette annonce
              </button>
            </div>
          </div>

          {/* Similar products */}
          {similar?.length > 0 && (
            <div className="mt-10">
              <h2 className="heading-sm text-dark mb-5">Annonces similaires</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {similar.slice(0, 5).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
