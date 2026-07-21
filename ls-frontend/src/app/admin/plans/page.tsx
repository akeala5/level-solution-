'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Loader2, Save } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface PlanConfig {
  plan: string
  name: string
  nameEn: string
  maxProducts: number
  monthlyPrice: number
  yearlyPrice: number
  commission: number
  sponsoredAdsPerMonth: number
  hasStats: boolean
  hasShopPage: boolean
  hasBadge: boolean
  features: string[]
  isActive: boolean
}

// Champs numériques/texte éditables inline ; chaque carte a son propre bouton
// Enregistrer (PATCH /subscriptions/admin/plans/:plan → invalide le cache serveur).
function PlanCard({ plan, onSaved }: { plan: PlanConfig; onSaved: () => void }) {
  const [form, setForm] = useState<PlanConfig>(plan)
  const dirty = JSON.stringify(form) !== JSON.stringify(plan)

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, nameEn: form.nameEn,
        maxProducts: Number(form.maxProducts),
        monthlyPrice: Number(form.monthlyPrice),
        yearlyPrice: Number(form.yearlyPrice),
        commission: Number(form.commission),
        sponsoredAdsPerMonth: Number(form.sponsoredAdsPerMonth),
        hasStats: form.hasStats, hasShopPage: form.hasShopPage, hasBadge: form.hasBadge,
        features: form.features, isActive: form.isActive,
      }
      return (await api.patch(`/subscriptions/admin/plans/${form.plan}`, payload)).data
    },
    onSuccess: () => { toast.success(`Forfait ${form.plan} enregistré`); onSaved() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  })

  const num = (k: keyof PlanConfig) => (
    <input type="number" value={form[k] as number}
      onChange={(e) => setForm({ ...form, [k]: e.target.value === '' ? 0 : Number(e.target.value) })}
      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-dark focus:border-primary outline-none" />
  )

  const toggle = (k: keyof PlanConfig, label: string) => (
    <button type="button" onClick={() => setForm({ ...form, [k]: !form[k] })}
      className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
        form[k] ? 'bg-accent/10 text-accent border-accent/30' : 'bg-surface text-muted border-border')}>
      {label}
    </button>
  )

  return (
    <div className={cn('bg-card rounded-2xl border p-5 flex flex-col gap-3', form.isActive ? 'border-border' : 'border-border opacity-70')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-dark">{form.plan}</span>
          {toggle('isActive', form.isActive ? 'Actif' : 'Masqué')}
        </div>
        <span className="text-[11px] text-muted">commission {(form.commission * 100).toFixed(1)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="text-[11px] text-muted">Nom (FR)<input value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-dark focus:border-primary outline-none" /></label>
        <label className="text-[11px] text-muted">Nom (EN)<input value={form.nameEn}
          onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
          className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-dark focus:border-primary outline-none" /></label>
        <label className="text-[11px] text-muted">Prix mensuel (FCFA){num('monthlyPrice')}</label>
        <label className="text-[11px] text-muted">Prix annuel (FCFA){num('yearlyPrice')}</label>
        <label className="text-[11px] text-muted">Max annonces{num('maxProducts')}</label>
        <label className="text-[11px] text-muted">Pubs sponso./mois{num('sponsoredAdsPerMonth')}</label>
        <label className="text-[11px] text-muted col-span-2">Commission (fraction, ex. 0.05 = 5%){num('commission')}</label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {toggle('hasStats', 'Statistiques')}
        {toggle('hasShopPage', 'Boutique Pro')}
        {toggle('hasBadge', 'Badge')}
      </div>

      <label className="text-[11px] text-muted">Features (une par ligne)
        <textarea rows={3} value={form.features.join('\n')}
          onChange={(e) => setForm({ ...form, features: e.target.value.split('\n').map((f) => f.trim()).filter(Boolean) })}
          className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-dark focus:border-primary outline-none resize-none" />
      </label>

      <button onClick={() => save.mutate()} disabled={!dirty || save.isPending}
        className={cn('inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-colors',
          dirty ? 'bg-accent text-white hover:bg-accent-600' : 'bg-surface text-muted border border-border cursor-not-allowed')}>
        {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {dirty ? 'Enregistrer' : 'À jour'}
      </button>
    </div>
  )
}

export default function AdminPlansPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || user?.role !== 'ADMIN')) router.push('/')
  }, [_hasHydrated, isAuthenticated, user, router])

  const { data: plans, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => (await api.get('/subscriptions/admin/plans')).data.data as PlanConfig[],
    enabled: _hasHydrated && isAuthenticated,
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-dark mb-1 flex items-center gap-2">
          <CreditCard size={24} className="text-primary" /> Forfaits & abonnements
        </h1>
        <p className="text-sm text-muted mb-6">Prix, limites, commissions et features. Source unique — la page tarifs et la facturation s'y alignent immédiatement.</p>

        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {(plans ?? []).map((p) => (
              <PlanCard key={p.plan} plan={p} onSaved={() => qc.invalidateQueries({ queryKey: ['admin-plans'] })} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
