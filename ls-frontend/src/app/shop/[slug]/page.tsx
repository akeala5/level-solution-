'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Star, MapPin, Package, MessageSquare, Award, Shield,
  ChevronRight, Loader2, AlertCircle, Calendar, ThumbsUp,
  Search, SlidersHorizontal
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Product, Review } from '@/types'
import { formatPrice, formatNumber, timeAgo, getConditionLabel, cn } from '@/lib/utils'
import api from '@/lib/api'
import ProductCard from '@/components/product/ProductCard'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'popular', label: 'Plus populaires' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
]

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const { data: shopData, isLoading } = useQuery({
    queryKey: ['shop', slug],
    queryFn: () => api.get(`/users/shop/${slug}`).then((r) => r.data.data),
    enabled: !!slug,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products', slug, search, sortBy],
    queryFn: () =>
      api.get('/products', {
        params: { sellerSlug: slug, search, sortBy, limit: 20 },
      }).then((r) => r.data.data as Product[]),
    enabled: !!slug && activeTab === 'products',
  })

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['shop-reviews', slug],
    queryFn: () =>
      api.get(`/reviews/seller/${slug}`).then((r) => r.data.data as { reviews: Review[]; stats: any }),
    enabled: !!slug && activeTab === 'reviews',
  })

  const handleContact = () => {
    if (!isAuthenticated) { router.push('/auth/login?redirect=/chat'); return }
    router.push(`/chat?seller=${shopData?.seller?.id}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!shopData) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="text-muted mx-auto mb-3" />
          <p className="font-semibold text-dark mb-2">Boutique introuvable</p>
          <Link href="/products" className="btn-primary btn-sm">Voir les annonces</Link>
        </div>
      </div>
    )
  }

  const { seller, sellerProfile, stats } = shopData
  const isOwner = user?.id === seller?.id
  const products = productsData || []
  const reviews = reviewsData?.reviews || []
  const reviewStats = reviewsData?.stats

  return (
    <div className="min-h-screen bg-surface">
      {/* Shop banner */}
      <div className="relative h-40 md:h-56 bg-gradient-primary overflow-hidden">
        {sellerProfile?.shopBannerUrl && (
          <Image src={sellerProfile.shopBannerUrl} alt="Bannière" fill className="object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Shop header */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="container-custom py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-14 mb-4 relative z-10">
            {/* Logo */}
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border-4 border-white shadow-lg flex-shrink-0">
              {sellerProfile?.shopLogoUrl ? (
                <Image src={sellerProfile.shopLogoUrl} alt={sellerProfile.shopName} width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-black text-3xl">
                    {sellerProfile?.shopName?.[0] || seller?.firstName?.[0] || '?'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 sm:pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-dark text-xl">
                  {sellerProfile?.shopName || `${seller?.firstName} ${seller?.lastName}`}
                </h1>
                {seller?.isKycVerified && (
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    <Shield size={11} /> Vérifié
                  </div>
                )}
                {sellerProfile?.isBadgePro && (
                  <div className="flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full font-medium">
                    <Award size={11} /> Pro
                  </div>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-3 mt-1">
                {sellerProfile?.shopCity && (
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <MapPin size={12} /> {sellerProfile.shopCity}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Package size={12} /> {formatNumber(stats?.totalProducts || 0)} annonces
                </div>
                <div className="flex items-center gap-1 text-xs text-muted">
                  <ThumbsUp size={12} /> {formatNumber(sellerProfile?.totalSales || 0)} ventes
                </div>
                {sellerProfile?.avgRating > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-dark">{sellerProfile.avgRating?.toFixed(1)}</span>
                    <span className="text-muted">({sellerProfile.totalReviews} avis)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 sm:self-center">
              {isOwner ? (
                <Link href="/profile" className="btn-outline btn-sm gap-2">
                  Modifier la boutique
                </Link>
              ) : (
                <button onClick={handleContact} className="btn-primary btn-sm gap-2">
                  <MessageSquare size={14} /> Contacter
                </button>
              )}
            </div>
          </div>

          {/* Bio */}
          {sellerProfile?.shopDescription && (
            <p className="text-sm text-muted mb-4 max-w-2xl">{sellerProfile.shopDescription}</p>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border -mb-px">
            {(['products', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-dark'
                )}
              >
                {tab === 'products' ? `Annonces (${formatNumber(stats?.totalProducts || 0)})` : `Avis (${sellerProfile?.totalReviews || 0})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-custom py-6">
        {/* PRODUCTS */}
        {activeTab === 'products' && (
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher dans cette boutique..."
                  className="input pl-9 text-sm"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input text-sm max-w-[180px]"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {productsLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-muted" /></div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <Package size={40} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark mb-1">Aucune annonce</p>
                <p className="text-muted text-sm">
                  {search ? 'Aucun résultat pour cette recherche.' : 'Cette boutique n\'a pas encore d\'annonces.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
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
            ) : (
              <>
                {/* Stats */}
                {reviewStats && (
                  <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card mb-5">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-5xl font-black text-dark">{reviewStats.average?.toFixed(1)}</div>
                        <div className="flex justify-center mt-1">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} size={16} className={s <= Math.round(reviewStats.average) ? 'fill-amber-400 text-amber-400' : 'text-border'} />
                          ))}
                        </div>
                        <div className="text-xs text-muted mt-1">{reviewStats.total} avis</div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5,4,3,2,1].map((s) => {
                          const count = reviewStats.distribution?.[s] || 0
                          const pct = reviewStats.total ? (count / reviewStats.total) * 100 : 0
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
                  </div>
                )}

                {reviews.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                    <Star size={40} className="text-muted mx-auto mb-3" />
                    <p className="font-semibold text-dark mb-1">Aucun avis</p>
                    <p className="text-muted text-sm">Soyez le premier à laisser un avis sur cette boutique.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-5 border border-border/50 shadow-card"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                              {review.buyer?.profile?.firstName?.[0] || (review as any).giver?.firstName?.[0] || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-dark text-sm">
                                {review.buyer?.profile?.firstName || (review as any).giver?.firstName} {review.buyer?.profile?.lastName?.[0] || (review as any).giver?.lastName?.[0]}.
                              </p>
                              <div className="flex">
                                {[1,2,3,4,5].map((s) => (
                                  <Star key={s} size={12} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted flex-shrink-0">{timeAgo(review.createdAt)}</span>
                        </div>
                        {review.comment && <p className="text-sm text-dark leading-relaxed">{review.comment}</p>}
                        {review.sellerReply && (
                          <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/30">
                            <p className="text-xs text-muted mb-0.5">Réponse du vendeur :</p>
                            <p className="text-sm text-dark">{review.sellerReply}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
