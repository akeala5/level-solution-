'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Megaphone, Plus, Eye, MousePointer, TrendingUp,
  Calendar, DollarSign, Package, Loader2, ToggleRight, ToggleLeft, X
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, timeAgo, cn } from '@/lib/utils'
import { Modal } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const schema = z.object({
  productId: z.string().min(1, 'Sélectionnez un produit'),
  budget: z.coerce.number().min(5000, 'Budget minimum 5 000 FCFA'),
  startsAt: z.string().min(1, 'Date de début requise'),
  endsAt: z.string().min(1, 'Date de fin requise'),
})
type FormData = z.infer<typeof schema>

export default function SponsoredAdsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/auth/login')
  }, [_hasHydrated, isAuthenticated, router])

  const { data: adsData, isLoading: adsLoading } = useQuery({
    queryKey: ['sponsored-ads'],
    queryFn: () => api.get('/sponsored-ads').then((r) => r.data.data),
    enabled: isAuthenticated,
  })

  const { data: productsData } = useQuery({
    queryKey: ['seller-products-select'],
    queryFn: () => api.get('/products/me/listings?status=ACTIVE&limit=100').then((r) => r.data.data),
    enabled: isAuthenticated,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      startsAt: dayjs().format('YYYY-MM-DD'),
      endsAt: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/sponsored-ads', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsored-ads'] })
      toast.success('Annonce sponsorisée créée !')
      setShowCreate(false)
      reset()
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur lors de la création'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sponsored-ads/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sponsored-ads'] }); toast.success('Statut mis à jour') },
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const ads = adsData?.ads || adsData || []
  const products = productsData?.products || productsData || []

  // Stats globales
  const totalViews  = ads.reduce((s: number, a: any) => s + (a.views || 0), 0)
  const totalClicks = ads.reduce((s: number, a: any) => s + (a.clicks || 0), 0)
  const totalSpent  = ads.reduce((s: number, a: any) => s + (a.spent || 0), 0)
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted mb-5">
          <Link href="/dashboard/seller" className="hover:text-primary">Dashboard</Link>
          <span>/</span>
          <span className="text-dark font-medium">Annonces sponsorisées</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="heading-sm text-dark flex items-center gap-2">
              <Megaphone size={22} className="text-accent" /> Annonces Sponsorisées
            </h1>
            <p className="text-muted text-sm mt-0.5">Boostez la visibilité de vos produits</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm gap-2">
            <Plus size={14} /> Créer une campagne
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Impressions',  value: totalViews.toLocaleString(),  icon: Eye,           color: 'text-primary',  bg: 'bg-primary/10' },
            { label: 'Clics',        value: totalClicks.toLocaleString(), icon: MousePointer,  color: 'text-accent',   bg: 'bg-accent/10' },
            { label: 'CTR',          value: `${ctr}%`,                    icon: TrendingUp,    color: 'text-success',  bg: 'bg-success/10' },
            { label: 'Budget dépensé', value: formatPrice(totalSpent),    icon: DollarSign,    color: 'text-warning',  bg: 'bg-amber-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-border/50 shadow-card">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                <s.icon size={18} className={s.color} />
              </div>
              <div className="text-xl font-black text-dark">{s.value}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Liste des campagnes */}
        {adsLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted" /></div>
        ) : ads.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-border/50">
            <Megaphone size={40} className="text-muted mx-auto mb-3" />
            <p className="font-semibold text-dark mb-1">Aucune campagne active</p>
            <p className="text-muted text-sm mb-4">Sponsorisez un produit pour augmenter sa visibilité de 10×.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm">
              Créer ma première campagne
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map((ad: any) => {
              const isActive = ad.isActive && dayjs().isBefore(dayjs(ad.endsAt))
              const adCtr = ad.views > 0 ? ((ad.clicks / ad.views) * 100).toFixed(1) : '0'
              return (
                <motion.div key={ad.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 border border-border/50 shadow-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface border border-border flex-shrink-0">
                      {ad.product?.images?.[0]?.url
                        ? <Image src={ad.product.images[0].url} alt={ad.product.title} width={56} height={56} className="object-cover w-full h-full" />
                        : <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-muted" /></div>
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-dark text-sm truncate">{ad.product?.title}</p>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold',
                          isActive ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
                        )}>
                          {isActive ? '● Actif' : '○ Inactif'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1"><Eye size={11} /> {ad.views.toLocaleString()} vues</span>
                        <span className="flex items-center gap-1"><MousePointer size={11} /> {ad.clicks.toLocaleString()} clics</span>
                        <span className="flex items-center gap-1"><TrendingUp size={11} /> CTR {adCtr}%</span>
                        <span className="flex items-center gap-1"><Calendar size={11} /> jusqu'au {dayjs(ad.endsAt).format('DD/MM/YYYY')}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted">Dépensé</p>
                      <p className="font-bold text-dark text-sm">{formatPrice(ad.spent)}</p>
                      <p className="text-xs text-muted">/ {formatPrice(ad.budget)}</p>
                    </div>

                    <button onClick={() => toggleMutation.mutate(ad.id)}
                      className="flex-shrink-0 text-muted hover:text-dark transition-colors"
                      title={ad.isActive ? 'Mettre en pause' : 'Activer'}
                    >
                      {ad.isActive ? <ToggleRight size={22} className="text-success" /> : <ToggleLeft size={22} />}
                    </button>
                  </div>

                  {/* Barre de budget */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>Budget consommé</span>
                      <span>{ad.budget > 0 ? Math.round((ad.spent / ad.budget) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-1.5">
                      <div
                        className="bg-primary rounded-full h-1.5 transition-all"
                        style={{ width: `${ad.budget > 0 ? Math.min(100, (ad.spent / ad.budget) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Modal création */}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Créer une campagne sponsorisée" size="md">
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Produit à sponsoriser</label>
              <select {...register('productId')} className={`input ${errors.productId ? 'input-error' : ''}`}>
                <option value="">Sélectionnez un produit</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title} — {formatPrice(p.price)}</option>
                ))}
              </select>
              {errors.productId && <p className="text-xs text-danger mt-1">{errors.productId.message}</p>}
            </div>

            <div>
              <label className="label">Budget total (FCFA)</label>
              <input {...register('budget')} type="number" min={5000} step={1000} placeholder="Ex: 25 000" className={`input ${errors.budget ? 'input-error' : ''}`} />
              {errors.budget && <p className="text-xs text-danger mt-1">{errors.budget.message}</p>}
              <p className="text-xs text-muted mt-1">Minimum 5 000 FCFA · Coût estimé : ~50 FCFA / clic</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Début</label>
                <input {...register('startsAt')} type="date" className={`input ${errors.startsAt ? 'input-error' : ''}`} />
              </div>
              <div>
                <label className="label">Fin</label>
                <input {...register('endsAt')} type="date" className={`input ${errors.endsAt ? 'input-error' : ''}`} />
              </div>
            </div>

            <div className="bg-accent/5 rounded-xl p-3 text-xs text-dark/70 space-y-1">
              <p>✅ Votre annonce apparaît en <strong>1ère position</strong> dans sa catégorie</p>
              <p>✅ Badge <strong>"Sponsorisé"</strong> visible mais discret</p>
              <p>✅ Facturation au <strong>clic réel</strong> uniquement</p>
              <p>✅ Vous pouvez <strong>mettre en pause</strong> à tout moment</p>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Lancer la campagne'}
            </button>
          </form>
        </Modal>
      </div>
    </div>
  )
}
