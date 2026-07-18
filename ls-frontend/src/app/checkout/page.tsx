'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  CreditCard, Smartphone, ShieldCheck, ArrowLeft, Lock,
  ShoppingBag, CheckCircle, Loader2, ChevronDown,
  User, Globe, Signal, Phone, MapPin, Home, FileText, Wallet,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, cn } from '@/lib/utils'
import api from '@/lib/api'
import Link from 'next/link'

const COUNTRIES = [
  { code: 'BJ', label: 'Bénin',         dialCode: '+229', flag: '🇧🇯' },
  { code: 'TG', label: 'Togo',          dialCode: '+228', flag: '🇹🇬' },
  { code: 'GN', label: 'Guinée',        dialCode: '+224', flag: '🇬🇳' },
  { code: 'CI', label: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { code: 'NE', label: 'Niger',         dialCode: '+227', flag: '🇳🇪' },
  { code: 'SN', label: 'Sénégal',       dialCode: '+221', flag: '🇸🇳' },
  { code: 'ML', label: 'Mali',          dialCode: '+223', flag: '🇲🇱' },
  { code: 'BF', label: 'Burkina Faso',  dialCode: '+226', flag: '🇧🇫' },
]

const OPERATORS_BY_COUNTRY: Record<string, string[]> = {
  BJ: ['MTN', 'Moov', 'Celtis', 'BMO', 'Coris Money'],
  TG: ['Mixx By Yas', 'Moov'],
  GN: ['MTN'],
  CI: ['MTN', 'Moov', 'Wave', 'Orange'],
  NE: ['Airtel'],
  SN: ['Wave', 'Orange', 'Free Sénégal'],
  ML: ['Orange'],
  BF: [],
}

const schema = z.object({
  paymentMethod: z.enum(['FEDAPAY', 'STRIPE', 'ESCROW']),
  firstName: z.string().min(2, 'Prénom requis'),
  lastName:  z.string().min(2, 'Nom requis'),
  country:   z.string().optional(),
  operator:  z.string().optional(),
  phone:     z.string().min(6, 'Numéro requis'),
  city:      z.string().min(2, 'Ville requise'),
  address:   z.string().min(5, 'Adresse requise'),
  notes:     z.string().optional(),
})
type FormData = z.infer<typeof schema>

const PAYMENT_METHODS = [
  {
    id: 'FEDAPAY' as const,
    label: 'Mobile Money',
    desc: 'Wave · TMoney · MTN · Orange · Moov…',
    icon: Smartphone,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
    idle:   'border-slate-200 hover:border-amber-300',
    dot:    'bg-amber-500',
  },
  {
    id: 'STRIPE' as const,
    label: 'Carte bancaire',
    desc: 'Visa, Mastercard — via Stripe',
    icon: CreditCard,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50',
    active: 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200',
    idle:   'border-slate-200 hover:border-indigo-300',
    dot:    'bg-indigo-500',
  },
  {
    id: 'ESCROW' as const,
    label: 'Escrow LS',
    desc: "Fonds bloqués jusqu'à livraison confirmée",
    icon: ShieldCheck,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
    idle:   'border-slate-200 hover:border-emerald-300',
    dot:    'bg-emerald-500',
  },
]

// Label enrichi avec badge icône coloré
function FieldLabel({
  icon: Icon,
  iconClass,
  bgClass,
  children,
  optional,
}: {
  icon: React.ElementType
  iconClass: string
  bgClass: string
  children: React.ReactNode
  optional?: boolean
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
      <span className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', bgClass)}>
        <Icon size={11} className={iconClass} />
      </span>
      {children}
      {optional && <span className="text-slate-400 font-normal ml-0.5">(optionnel)</span>}
    </label>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const { items, totalPrice, clearCart } = useCartStore()
  const [step, setStep] = useState<'form' | 'escrow' | 'success'>('form')
  const [displayOrderId, setDisplayOrderId] = useState('')
  const [escrowData, setEscrowData] = useState<{
    reference: string; totalAmount: number; primaryOrderId: string;
    bankName: string; accountName: string; accountNumber: string; swift: string; note: string;
  } | null>(null)

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) { router.push('/auth/login?redirect=/checkout'); return }
    if (_hasHydrated && items.length === 0 && step === 'form') router.push('/cart')
  }, [_hasHydrated, isAuthenticated, items.length, router, step])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('payment') === 'cancelled') {
      toast.error('Paiement annulé — vous pouvez réessayer')
    }
  }, [])

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: 'FEDAPAY',
      firstName: user?.firstName || '',
      lastName:  user?.lastName  || '',
      country:   'TG',
      operator:  'Mixx By Yas',
      phone:     '',
      city:      user?.profile?.city || '',
      address:   '',
      notes:     '',
    },
  })

  const paymentMethod   = watch('paymentMethod')
  const selectedCountry = watch('country') || 'TG'
  const notesValue      = watch('notes') || ''
  const isPremiumBuyer  = user?.subscription?.plan !== undefined && user.subscription.plan !== 'FREE'
  const deliveryTotal   = items.reduce((acc, i) => acc + (i.hasDelivery ? i.deliveryPrice || 0 : 0), 0)
  const itemsOnlyTotal  = totalPrice() - deliveryTotal
  const subtotal        = isPremiumBuyer ? itemsOnlyTotal : totalPrice()

  const operators   = useMemo(() => OPERATORS_BY_COUNTRY[selectedCountry] || [], [selectedCountry])
  const countryInfo = COUNTRIES.find((c) => c.code === selectedCountry)

  useEffect(() => {
    const ops = OPERATORS_BY_COUNTRY[selectedCountry] || []
    setValue('operator', ops[0] || '')
  }, [selectedCountry, setValue])

  const onSubmit = async (data: FormData) => {
    const shippingNote = `Livraison: ${data.firstName} ${data.lastName} — ${data.address}, ${data.city} — Tél: ${countryInfo?.dialCode || ''} ${data.phone}`
    const fullNotes    = data.notes ? `${data.notes}\n${shippingNote}` : shippingNote

    // ── Création TRANSACTIONNELLE : tout le panier en un seul appel.
    // Le back groupe par vendeur (1 sous-commande/vendeur) — tout réussit ou
    // tout échoue, plus de commandes orphelines ni de rollback client.
    let createdOrderIds: string[] = []
    try {
      const res = await api.post('/orders/checkout', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        notes: fullNotes,
      })
      createdOrderIds = res.data.data.orderIds
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création de la commande')
      return
    }

    const primaryOrderId = createdOrderIds[0]
    setDisplayOrderId(primaryOrderId.slice(0, 8).toUpperCase())

    try {
      if (data.paymentMethod === 'FEDAPAY') {
        if (!data.country || !data.operator) { toast.error('Sélectionnez un pays et un opérateur'); return }
        if (operators.length === 0) { toast.error('Aucun opérateur Mobile Money disponible pour ce pays'); return }
        toast.loading('Connexion à FedaPay…', { id: 'fp' })
        const res = await api.post('/payments/fedapay/checkout', {
          orderIds:    createdOrderIds,
          method:      `${data.country}:${data.operator}`,
          phoneNumber: data.phone,
          country:     data.country,
        }, { timeout: 30000 })
        toast.dismiss('fp')
        const url = res.data?.data?.paymentUrl
        if (url) { clearCart(); window.location.href = url; return }
        toast.error("Impossible d'obtenir le lien de paiement FedaPay")
        return
      }

      if (data.paymentMethod === 'STRIPE') {
        toast.loading('Connexion à Stripe…', { id: 'st' })
        const res = await api.post('/payments/stripe/checkout', { orderIds: createdOrderIds })
        toast.dismiss('st')
        const url = res.data?.data?.checkoutUrl
        if (url) { clearCart(); window.location.href = url; return }
        toast.error("Impossible d'obtenir le lien de paiement Stripe")
        return
      }

      if (data.paymentMethod === 'ESCROW') {
        toast.loading('Création du paiement Escrow…', { id: 'escrow' })
        const res = await api.post('/payments/escrow/checkout', { orderIds: createdOrderIds })
        toast.dismiss('escrow')
        const esc = res.data?.data
        if (esc) {
          clearCart()
          setDisplayOrderId(esc.primaryOrderId.slice(0, 8).toUpperCase())
          setEscrowData(esc)
          setStep('escrow')
          return
        }
        toast.error("Impossible de créer la commande Escrow")
        return
      }
    } catch (err: any) {
      toast.dismiss('fp')
      toast.dismiss('st')
      toast.dismiss('escrow')
      toast.error(err.response?.data?.message || 'Erreur lors du paiement')
    }
  }

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  if (step === 'escrow' && escrowData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-xl"
        >
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center mb-1">Commande créée — Virement requis</h1>
          <p className="text-slate-500 text-sm text-center mb-5">
            Effectuez le virement ci-dessous pour confirmer votre commande.
          </p>

          {/* Référence + Montant */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Référence</span>
              <span className="font-mono font-bold text-emerald-700">{escrowData.reference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Montant à virer</span>
              <span className="font-bold text-slate-900">{formatPrice(escrowData.totalAmount)}</span>
            </div>
          </div>

          {/* Coordonnées bancaires */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Coordonnées bancaires</p>
            <div className="flex justify-between">
              <span className="text-slate-500">Banque</span>
              <span className="font-medium text-slate-800">{escrowData.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bénéficiaire</span>
              <span className="font-medium text-slate-800">{escrowData.accountName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IBAN / Compte</span>
              <span className="font-mono text-xs font-bold text-slate-800">{escrowData.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SWIFT / BIC</span>
              <span className="font-mono font-bold text-slate-800">{escrowData.swift}</span>
            </div>
          </div>

          {/* Note importante */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
            ⚠️ {escrowData.note}
          </div>

          <div className="space-y-2">
            <Link href={`/orders/${escrowData.primaryOrderId}`} className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-emerald-700 transition-colors w-full">
              Suivre ma commande
            </Link>
            <Link href="/dashboard/buyer" className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-medium text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors w-full">
              Mes commandes
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-xl"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Commande confirmée !</h1>
          <p className="text-slate-500 text-sm mb-1">Numéro de commande</p>
          <p className="font-mono font-bold text-indigo-600 text-xl mb-4">#{displayOrderId}</p>
          <p className="text-slate-500 text-sm mb-7">
            Vous recevrez un email de confirmation. Le vendeur sera notifié.
          </p>
          <div className="space-y-2">
            <Link href="/dashboard/buyer" className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-indigo-700 transition-colors w-full">
              Voir mes commandes
            </Link>
            <Link href="/products" className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-medium text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors w-full">
              Continuer mes achats
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-custom py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <Link href="/cart" className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-indigo-300 transition-colors shadow-sm">
            <ArrowLeft size={15} className="text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Finaliser la commande</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">

            {/* ── Colonne gauche ── */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Mode de paiement */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Wallet size={13} className="text-indigo-500" />
                    </span>
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Mode de paiement
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setValue('paymentMethod', m.id)}
                        className={cn(
                          'flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left',
                          paymentMethod === m.id ? m.active : m.idle,
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', paymentMethod === m.id ? m.iconBg : 'bg-slate-50')}>
                            <m.icon size={15} className={paymentMethod === m.id ? m.iconColor : 'text-slate-400'} />
                          </span>
                          <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center', paymentMethod === m.id ? `${m.dot} border-transparent` : 'border-slate-300')}>
                            {paymentMethod === m.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">{m.label}</p>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Champs */}
                <div className="p-5 space-y-4">

                  {/* Prénom / Nom */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel icon={User} iconClass="text-indigo-500" bgClass="bg-indigo-50">Prénom</FieldLabel>
                      <div className="relative">
                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" />
                        <input
                          {...register('firstName')}
                          placeholder="Kofi"
                          className={cn('w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50', errors.firstName ? 'border-rose-400' : 'border-slate-200')}
                        />
                      </div>
                      {errors.firstName && <p className="text-[11px] text-rose-500 mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <FieldLabel icon={User} iconClass="text-indigo-500" bgClass="bg-indigo-50">Nom</FieldLabel>
                      <div className="relative">
                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" />
                        <input
                          {...register('lastName')}
                          placeholder="Mensah"
                          className={cn('w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50', errors.lastName ? 'border-rose-400' : 'border-slate-200')}
                        />
                      </div>
                      {errors.lastName && <p className="text-[11px] text-rose-500 mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  {/* Indicatif / Opérateur */}
                  <AnimatePresence>
                    {paymentMethod === 'FEDAPAY' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-2 gap-3 overflow-hidden"
                      >
                        <div>
                          <FieldLabel icon={Globe} iconClass="text-emerald-500" bgClass="bg-emerald-50">Indicatif</FieldLabel>
                          <div className="relative">
                            <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300 pointer-events-none" />
                            <select
                              {...register('country')}
                              className="w-full border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50 appearance-none"
                            >
                              {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.flag} {c.dialCode} — {c.label}</option>
                              ))}
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <FieldLabel icon={Signal} iconClass="text-amber-500" bgClass="bg-amber-50">Opérateur</FieldLabel>
                          {operators.length > 0 ? (
                            <div className="relative">
                              <Signal size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-300 pointer-events-none" />
                              <select
                                {...register('operator')}
                                className="w-full border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50 appearance-none"
                              >
                                {operators.map((op) => (
                                  <option key={op} value={op}>{op}</option>
                                ))}
                              </select>
                              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          ) : (
                            <div className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-amber-50 text-amber-700">
                              {selectedCountry === 'BF'
                                ? 'Burkina Faso non disponible — Mobile Money indisponible dans ce pays pour l\'instant'
                                : 'Aucun opérateur disponible pour ce pays'}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Numéro / Ville */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel icon={Phone} iconClass="text-sky-500" bgClass="bg-sky-50">
                        {paymentMethod === 'FEDAPAY' ? 'Numéro Mobile Money' : 'Téléphone'}
                      </FieldLabel>
                      <div className="flex">
                        {paymentMethod === 'FEDAPAY' && countryInfo && (
                          <span className="flex items-center gap-1 px-2.5 text-xs text-slate-500 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl shrink-0">
                            {countryInfo.flag} {countryInfo.dialCode}
                          </span>
                        )}
                        <div className="relative flex-1 min-w-0">
                          <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-300 pointer-events-none" />
                          <input
                            {...register('phone')}
                            type="tel"
                            placeholder={paymentMethod === 'FEDAPAY' ? '90 00 00 00' : '+228 90 00 00 00'}
                            className={cn(
                              'w-full border py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50',
                              paymentMethod === 'FEDAPAY' && countryInfo ? 'rounded-r-xl' : 'rounded-xl',
                              errors.phone ? 'border-rose-400' : 'border-slate-200',
                            )}
                          />
                        </div>
                      </div>
                      {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone.message}</p>}
                    </div>
                    <div>
                      <FieldLabel icon={MapPin} iconClass="text-rose-500" bgClass="bg-rose-50">Ville</FieldLabel>
                      <div className="relative">
                        <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-300 pointer-events-none" />
                        <input
                          {...register('city')}
                          placeholder="Lomé, Abidjan…"
                          className={cn('w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50', errors.city ? 'border-rose-400' : 'border-slate-200')}
                        />
                      </div>
                      {errors.city && <p className="text-[11px] text-rose-500 mt-1">{errors.city.message}</p>}
                    </div>
                  </div>

                  {/* Adresse */}
                  <div>
                    <FieldLabel icon={Home} iconClass="text-orange-500" bgClass="bg-orange-50">Adresse</FieldLabel>
                    <div className="relative">
                      <Home size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-300 pointer-events-none" />
                      <input
                        {...register('address')}
                        placeholder="Quartier, rue, point de repère…"
                        className={cn('w-full border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50', errors.address ? 'border-rose-400' : 'border-slate-200')}
                      />
                    </div>
                    {errors.address && <p className="text-[11px] text-rose-500 mt-1">{errors.address.message}</p>}
                  </div>

                  {/* Notes */}
                  <div>
                    <FieldLabel icon={FileText} iconClass="text-violet-500" bgClass="bg-violet-50" optional>Notes</FieldLabel>
                    <div className="relative">
                      <FileText size={13} className="absolute left-3 top-3 text-violet-300 pointer-events-none" />
                      <textarea
                        {...register('notes', { maxLength: 500 })}
                        rows={2}
                        maxLength={500}
                        placeholder="Instructions particulières pour le vendeur…"
                        className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-slate-50 resize-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 text-right mt-0.5">{notesValue.length}/500</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Récapitulatif ── */}
            <div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-24">
                <h2 className="font-bold text-slate-900 text-sm mb-4">Votre commande</h2>

                <div className="space-y-3 mb-4 max-h-52 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                        {item.imageUrl
                          ? <Image src={item.imageUrl} alt={item.title} width={48} height={48} className="object-cover w-full h-full" />
                          : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={14} className="text-slate-300" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-400">×{item.quantity}</p>
                      </div>
                      <span className="text-xs font-bold text-slate-800 shrink-0">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 mb-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total</span>
                    <span className="font-medium">{formatPrice(itemsOnlyTotal)}</span>
                  </div>
                  {deliveryTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Livraison</span>
                      {isPremiumBuyer ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                          <span className="line-through text-slate-400 font-normal">{formatPrice(deliveryTotal)}</span>
                          Offerte ✦ Premium
                        </span>
                      ) : (
                        <span className="font-medium">{formatPrice(deliveryTotal)}</span>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Protection acheteur</span>
                    <span className="text-emerald-600 font-medium text-xs">Incluse ✓</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 mb-5 flex justify-between font-bold">
                  <span className="text-slate-900">Total</span>
                  <span className="text-indigo-600 text-lg">{formatPrice(subtotal)}</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (paymentMethod === 'FEDAPAY' && operators.length === 0)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-md shadow-indigo-100"
                >
                  {isSubmitting
                    ? <Loader2 size={16} className="animate-spin" />
                    : <><Lock size={14} /> Confirmer et payer</>
                  }
                </button>

                <p className="text-[10px] text-slate-400 text-center mt-3">
                  Paiement sécurisé — Remboursement garanti si non conforme
                </p>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
