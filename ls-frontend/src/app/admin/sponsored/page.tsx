'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Loader2, Check, X, Pin } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const STATUS_META: Record<string, { label: string; dot: string }> = {
  PENDING:  { label: 'En attente', dot: 'bg-amber-500' },
  APPROVED: { label: 'Approuvée', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejetée',   dot: 'bg-red-500' },
}

export default function AdminSponsoredPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || user?.role !== 'ADMIN')) router.push('/')
  }, [_hasHydrated, isAuthenticated, user, router])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sponsored'],
    queryFn: async () => (await api.get('/sponsored-ads/admin/all?limit=50')).data.data,
    enabled: _hasHydrated && isAuthenticated,
  })

  const mut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => (await api.patch(`/sponsored-ads/admin/${id}`, patch)).data,
    onSuccess: () => { toast.success('Campagne mise à jour'); qc.invalidateQueries({ queryKey: ['admin-sponsored'] }) },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const ads = data?.data ?? []

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-dark mb-1 flex items-center gap-2"><Megaphone size={24} className="text-primary" /> Pubs sponsorisées</h1>
        <p className="text-sm text-muted mb-6">Modération et mise en avant. Ordre dans le hero : épinglées → priorité → budget.</p>

        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : ads.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted text-sm">Aucune campagne sponsorisée pour le moment.</div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="px-4 py-3 font-medium">Produit</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Budget / dépensé</th>
                    <th className="px-4 py-3 font-medium">Vues / clics</th>
                    <th className="px-4 py-3 font-medium">Priorité</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((a: any) => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-dark line-clamp-1">{a.product?.title || '—'}</div>
                        <div className="text-xs text-muted">{a.user?.firstName} {a.user?.lastName}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-dark">{formatPrice(a.budget)} <span className="text-muted">/ {formatPrice(a.spent)}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{a.views} / {a.clicks}</td>
                      <td className="px-4 py-3">
                        <input type="number" defaultValue={a.priority} onBlur={(e) => { const v = Number(e.target.value); if (v !== a.priority) mut.mutate({ id: a.id, patch: { priority: v } }) }}
                          className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-dark focus:border-primary outline-none" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-dark whitespace-nowrap">
                          <span className={cn('w-2 h-2 rounded-full', STATUS_META[a.status]?.dot)} /> {STATUS_META[a.status]?.label || a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => mut.mutate({ id: a.id, patch: { isPinned: !a.isPinned } })}
                            className={cn('p-1.5 rounded-lg', a.isPinned ? 'text-accent bg-accent/10' : 'text-muted hover:text-accent hover:bg-accent/10')} title={a.isPinned ? 'Désépingler' : 'Épingler'}>
                            <Pin size={15} />
                          </button>
                          {a.status !== 'APPROVED' && (
                            <button onClick={() => mut.mutate({ id: a.id, patch: { status: 'APPROVED' } })}
                              className="p-1.5 rounded-lg text-muted hover:text-emerald-600 hover:bg-emerald-50" title="Approuver"><Check size={16} /></button>
                          )}
                          {a.status !== 'REJECTED' && (
                            <button onClick={() => mut.mutate({ id: a.id, patch: { status: 'REJECTED' } })}
                              className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50" title="Rejeter (retire du hero)"><X size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
