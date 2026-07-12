'use client'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { X, Star, Package, ShoppingCart, BarChart2, GitCompare } from 'lucide-react'
import { useCompareStore } from '@/store/compare.store'
import { useCartStore } from '@/store/cart.store'
import { formatPrice, getConditionLabel, cn, imgBlurDataURL } from '@/lib/utils'

// ─── Floating bar ──────────────────────────────────────────────────────────────
export function CompareBar() {
  const { items, removeItem, clearItems, openDrawer } = useCompareStore()

  return (
    <AnimatePresence>
      {items.length >= 1 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-border shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 max-w-lg w-[calc(100vw-2rem)]"
        >
          <BarChart2 size={16} className="text-primary shrink-0" />
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {items.map((p) => (
              <div key={p.id} className="relative shrink-0 group">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-surface">
                  {p.images?.[0]?.url ? (
                    <Image src={p.images[0].url} alt={p.title} width={40} height={40} className="object-cover w-full h-full" placeholder="blur" blurDataURL={imgBlurDataURL} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={14} className="text-muted" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeItem(p.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
            {Array.from({ length: 4 - items.length }).map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-lg border-2 border-dashed border-border/50 shrink-0" />
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={clearItems} className="text-xs text-muted hover:text-danger transition-colors">
              <X size={14} />
            </button>
            <button
              onClick={openDrawer}
              disabled={items.length < 2}
              className={cn(
                'text-xs font-bold px-3 py-1.5 rounded-xl transition-all',
                items.length >= 2
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-muted/20 text-muted cursor-not-allowed'
              )}
            >
              Comparer {items.length > 0 && `(${items.length})`}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Row label ─────────────────────────────────────────────────────────────────
function Row({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <div className="grid gap-0" style={{ gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}>
      <div className="bg-surface px-3 py-3 text-xs font-semibold text-muted border-b border-border">{label}</div>
      {values.map((v, i) => (
        <div key={i} className="px-3 py-3 text-sm text-dark border-b border-l border-border">{v}</div>
      ))}
    </div>
  )
}

// ─── Drawer ────────────────────────────────────────────────────────────────────
export function CompareDrawer() {
  const { items, isOpen, closeDrawer, removeItem } = useCompareStore()
  const { addItem } = useCartStore()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <GitCompare size={18} className="text-primary" />
                <h2 className="font-bold text-dark">Comparaison produits</h2>
                <span className="text-xs text-muted">({items.length} produits)</span>
              </div>
              <button onClick={closeDrawer} className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center hover:bg-border/50 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-auto flex-1">
              {/* Product headers */}
              <div className="grid sticky top-0 bg-white z-10 border-b border-border shadow-sm" style={{ gridTemplateColumns: `140px repeat(${items.length}, 1fr)` }}>
                <div className="bg-surface px-3 py-4" />
                {items.map((p) => (
                  <div key={p.id} className="px-3 py-3 border-l border-border">
                    <div className="relative aspect-[4/3] mb-2 rounded-xl overflow-hidden bg-surface border border-border">
                      {p.images?.[0]?.url ? (
                        <Image src={p.images[0].url} alt={p.title} fill className="object-contain p-2" placeholder="blur" blurDataURL={imgBlurDataURL} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-muted" /></div>
                      )}
                      <button
                        onClick={() => removeItem(p.id)}
                        className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-danger hover:text-white transition-all"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-dark line-clamp-2">{p.title}</p>
                  </div>
                ))}
              </div>

              {/* Comparison rows */}
              <Row label="Prix" values={items.map((p) => (
                <span className="font-black text-primary">{formatPrice(p.price)}</span>
              ))} />
              <Row label="Condition" values={items.map((p) => {
                const c = getConditionLabel(p.condition)
                return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', c.color)}>{c.label}</span>
              })} />
              <Row label="Catégorie" values={items.map((p) => (
                <span className="text-xs text-muted">{p.category?.name || '—'}</span>
              ))} />
              <Row label="Note vendeur" values={items.map((p) => (
                p.seller?.sellerProfile?.avgRating ? (
                  <span className="flex items-center gap-1 text-xs">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    {p.seller.sellerProfile.avgRating.toFixed(1)}
                  </span>
                ) : <span className="text-muted text-xs">—</span>
              ))} />
              <Row label="Livraison" values={items.map((p) => (
                p.hasDelivery
                  ? <span className="text-xs text-emerald-600 font-medium">✓ {p.deliveryPrice ? formatPrice(p.deliveryPrice) : 'Gratuite'}</span>
                  : <span className="text-xs text-muted">Non</span>
              ))} />
              <Row label="Vendeur" values={items.map((p) => (
                <span className="text-xs">{p.seller?.firstName} {p.seller?.lastName?.[0]}.</span>
              ))} />
              <Row label="Vues" values={items.map((p) => (
                <span className="text-xs text-muted">{p.viewCount ?? 0}</span>
              ))} />

              {/* CTA row */}
              <div className="grid p-4 gap-3" style={{ gridTemplateColumns: `140px repeat(${items.length}, 1fr)` }}>
                <div />
                {items.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 px-1">
                    <Link
                      href={`/products/${p.slug}`}
                      onClick={closeDrawer}
                      className="text-xs font-semibold text-center py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      Voir l'annonce
                    </Link>
                    <button
                      onClick={() => {
                        addItem({ productId: p.id, title: p.title, price: p.price, imageUrl: p.images?.[0]?.url || '', sellerId: p.sellerId, quantity: 1, hasDelivery: p.hasDelivery ?? false, deliveryPrice: p.deliveryPrice ?? 0 })
                        closeDrawer()
                      }}
                      className="text-xs font-medium text-center py-2 border border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                    >
                      <ShoppingCart size={12} /> Panier
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
