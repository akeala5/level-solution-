'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  CreditCard, Smartphone, MapPin, User, Phone, Loader2,
  CheckCircle, ShieldCheck, ArrowLeft, Lock, ShoppingBag
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, cn } from '@/lib/utils'
import api from '@/lib/api'
import Link from 'next/link'

const schema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  phone: z.string().min(8, 'Numéro de téléphone requis'),
  city: z.string().min(2, 'Ville requise'),
  address: z.string().min(5, 'Adresse requise'),
  paymentMethod: z.enum(['FEDAPAY', 'STRIPE', 'ESCROW']),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const PAYMENT_METHODS = [
  {
    id: 'FEDAPAY' as const,
    label: 'Mobile Money',
    desc: 'Moov Money, Flooz, Wave',
    icon: Smartphone,
    color: 'border-orange-300 bg-orange-50',
    activeColor: 'border-orange-500 bg-orange-50 ring-2 ring-orange-300',
  },
  {
    id: 'STRIPE' as const,
    label: 'Carte bancaire',
    desc: 'Visa, Mastercard',
    icon: CreditCard,
    color: 'border-blue-200 bg-blue-50',
    activeColor: 'border-blue-500 bg-blue-50 ring-2 ring-blue-300',
  },
  {
    id: 'ESCROW' as const,
    label: 'Escrow LS',
    desc: 'Paiement sécurisé différé',
    icon: ShieldCheck,
    color: 'border-green-200 bg-green-50',
    activeColor: 'border-green-500 bg-green-50 ring-2 ring-green-300',
  },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { items, totalPrice, clearCart } = useCartStore()
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
  const [orderId, setOrderId] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout')
      return
    }
    if (items.length === 0) {
      router.push('/cart')
    }
  }, [isAuthenticated, items.length, router])

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.profile ? (user as any).profile.firstName || user.firstName || '' : user?.firstName || '',
      lastName: user?.profile ? (user as any).profile.lastName || user.lastName || '' : user?.lastName || '',
      phone: user?.phone || '',
      city: user?.profile?.city || '',
      address: '',
      paymentMethod: 'FEDAPAY',
      notes: '',
    },
  })

  const paymentMethod = watch('paymentMethod')
  const subtotal = totalPrice()

  const onSubmit = async (data: FormData) => {
    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        hasDelivery: item.hasDelivery,
      }))

      const res = await api.post('/orders', {
        items: orderItems,
        shippingAddress: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          city: data.city,
          address: data.address,
        },
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      })

      const order = res.data.data
      setOrderId(order.id || order.orderNumber)

      // If payment redirect URL provided
      if (order.paymentUrl) {
        window.location.href = order.paymentUrl
        return
      }

      clearCart()
      setStep('success')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la commande')
    }
  }

  if (step === 'success') {
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
          <h1 className="heading-sm text-dark mb-2">Commande confirmée !</h1>
          <p className="text-muted text-sm mb-1">Numéro de commande :</p>
          <p className="font-mono font-bold text-primary mb-4">#{orderId}</p>
          <p className="text-muted text-sm mb-6">
            Vous recevrez un email de confirmation. Le vendeur sera notifié et prendra contact avec vous.
          </p>
          <div className="space-y-2">
            <Link href="/dashboard/buyer" className="btn-primary w-full justify-center">
              Voir mes commandes
            </Link>
            <Link href="/products" className="btn-outline w-full justify-center">
              Continuer mes achats
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/cart" className="w-9 h-9 border border-border rounded-xl flex items-center justify-center hover:bg-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="heading-sm text-dark">Finaliser la commande</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* LEFT: Form */}
            <div className="space-y-5">
              {/* Delivery info */}
              <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
                <h2 className="font-bold text-dark mb-4 flex items-center gap-2">
                  <MapPin size={17} className="text-primary" /> Informations de livraison
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Prénom</label>
                    <input {...register('firstName')} className={`input ${errors.firstName ? 'input-error' : ''}`} placeholder="Prénom" />
                    {errors.firstName && <p className="text-xs text-danger mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="label">Nom</label>
                    <input {...register('lastName')} className={`input ${errors.lastName ? 'input-error' : ''}`} placeholder="Nom" />
                    {errors.lastName && <p className="text-xs text-danger mt-1">{errors.lastName.message}</p>}
                  </div>
                  <div>
                    <label className="label">Téléphone</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input {...register('phone')} className={`input pl-9 ${errors.phone ? 'input-error' : ''}`} placeholder="+228 90 00 00 00" />
                    </div>
                    {errors.phone && <p className="text-xs text-danger mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="label">Ville</label>
                    <input {...register('city')} className={`input ${errors.city ? 'input-error' : ''}`} placeholder="Lomé, Abidjan..." />
                    {errors.city && <p className="text-xs text-danger mt-1">{errors.city.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Adresse</label>
                    <input {...register('address')} className={`input ${errors.address ? 'input-error' : ''}`} placeholder="Quartier, rue, point de repère..." />
                    {errors.address && <p className="text-xs text-danger mt-1">{errors.address.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Notes (optionnel)</label>
                    <textarea
                      {...register('notes')}
                      rows={2}
                      className="input resize-none"
                      placeholder="Instructions particulières pour le vendeur..."
                    />
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
                <h2 className="font-bold text-dark mb-4 flex items-center gap-2">
                  <Lock size={17} className="text-primary" /> Mode de paiement
                </h2>

                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setValue('paymentMethod', method.id)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                        paymentMethod === method.id ? method.activeColor : method.color
                      )}
                    >
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        <method.icon size={20} className="text-dark" />
                      </div>
                      <div>
                        <div className="font-semibold text-dark text-sm">{method.label}</div>
                        <div className="text-xs text-muted">{method.desc}</div>
                      </div>
                      <div className={cn(
                        'ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        paymentMethod === method.id ? 'border-primary bg-primary' : 'border-border'
                      )}>
                        {paymentMethod === method.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Summary */}
            <div>
              <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card sticky top-24">
                <h2 className="font-bold text-dark mb-4">Votre commande</h2>

                {/* Items */}
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface border border-border flex-shrink-0">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.title} width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag size={16} className="text-muted" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-dark truncate">{item.title}</p>
                        <p className="text-xs text-muted">x{item.quantity}</p>
                      </div>
                      <span className="text-xs font-bold text-dark">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Sous-total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Protection acheteur</span>
                    <span className="text-success">Incluse</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mb-5">
                  <div className="flex justify-between font-bold">
                    <span className="text-dark">Total</span>
                    <span className="text-primary text-lg">{formatPrice(subtotal)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full justify-center btn-lg"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Lock size={16} /> Confirmer et payer
                    </>
                  )}
                </button>

                <p className="text-xs text-muted text-center mt-3">
                  Paiement 100% sécurisé — Remboursement garanti si non conforme
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
