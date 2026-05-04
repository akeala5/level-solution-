'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCartStore()

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout')
      return
    }
    router.push('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart size={40} className="text-primary" />
          </div>
          <h1 className="heading-sm text-dark mb-2">Votre panier est vide</h1>
          <p className="text-muted mb-6">Parcourez nos annonces et ajoutez des produits à votre panier.</p>
          <Link href="/products" className="btn-primary">
            <ShoppingBag size={16} /> Voir les annonces
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = totalPrice()
  const deliveryTotal = items.reduce((acc, i) => acc + (i.hasDelivery ? (i.deliveryPrice || 0) * i.quantity : 0), 0)

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="heading-sm text-dark">
            Mon panier <span className="text-muted font-normal text-base">({totalItems()} article{totalItems() > 1 ? 's' : ''})</span>
          </h1>
          <button onClick={clearCart} className="text-xs text-danger hover:underline flex items-center gap-1">
            <Trash2 size={13} /> Vider le panier
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Items list */}
          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.productId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl p-4 border border-border/50 shadow-card flex gap-4"
                >
                  {/* Image */}
                  <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-surface border border-border">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.title} width={80} height={80} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={24} className="text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-dark text-sm leading-snug mb-1 truncate">{item.title}</h3>
                    {item.sellerName && <p className="text-xs text-muted mb-2">Vendeur : {item.sellerName}</p>}

                    <div className="flex items-center justify-between gap-3">
                      {/* Quantity control */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-surface text-dark transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-dark">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-surface text-dark transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Price + delete */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-primary text-sm">{formatPrice(item.price * item.quantity)}</div>
                          {item.hasDelivery && item.deliveryPrice && (
                            <div className="text-xs text-muted">+ {formatPrice(item.deliveryPrice)} livraison</div>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="w-8 h-8 rounded-xl text-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Continue shopping */}
            <Link href="/products" className="flex items-center gap-2 text-sm text-primary hover:underline pt-2">
              <ArrowRight size={14} className="rotate-180" /> Continuer mes achats
            </Link>
          </div>

          {/* Order summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card sticky top-24">
              <h2 className="font-bold text-dark mb-4">Résumé de la commande</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Sous-total ({totalItems()} article{totalItems() > 1 ? 's' : ''})</span>
                  <span className="text-dark font-medium">{formatPrice(subtotal - deliveryTotal)}</span>
                </div>
                {deliveryTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Livraison</span>
                    <span className="text-dark font-medium">{formatPrice(deliveryTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Protection acheteur</span>
                  <span className="text-success font-medium">Incluse</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-5">
                <div className="flex justify-between">
                  <span className="font-bold text-dark">Total</span>
                  <span className="font-black text-primary text-lg">{formatPrice(subtotal)}</span>
                </div>
              </div>

              <button onClick={handleCheckout} className="btn-primary w-full justify-center btn-lg">
                Passer la commande <ArrowRight size={16} />
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
                <Tag size={12} />
                <span>Paiement sécurisé — Mobile Money ou carte</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
