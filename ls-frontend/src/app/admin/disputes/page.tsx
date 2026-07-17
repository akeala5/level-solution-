'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Scale, Loader2, Eye } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { timeAgo, formatPrice, cn } from '@/lib/utils'
import { Modal, Button } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED_BUYER', 'RESOLVED_SELLER'] as const
const STATUS_META: Record<string, { label: string; dot: string }> = {
  OPEN:           { label: 'Ouvert',       dot: 'bg-amber-500' },
  IN_PROGRESS:    { label: 'En cours',     dot: 'bg-blue-500' },
  RESOLVED_BUYER: { label: 'Acheteur',     dot: 'bg-emerald-500' },
  RESOLVED_SELLER:{ label: 'Vendeur',      dot: 'bg-emerald-500' },
  CLOSED:         { label: 'Clôturé',      dot: 'bg-slate-400' },
}

export default function AdminDisputesPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [filter, setFilter] = useState<string>('OPEN')
  const [selected, setSelected] = useState<any>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || !['ADMIN', 'MODERATOR'].includes(user?.role || ''))) {
      router.push('/')
    }
  }, [_hasHydrated, isAuthenticated, user, router])

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes', filter],
    queryFn: async () => (await api.get(`/admin/disputes?status=${filter}`)).data.data,
    enabled: _hasHydrated && isAuthenticated,
  })

  const close = () => { setSelected(null); setNotes('') }
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-disputes'] })

  const inProgress = useMutation({
    mutationFn: async (id: string) => (await api.put(`/admin/disputes/${id}/in-progress`)).data,
    onSuccess: (r) => { toast.success(r.message || 'Mis à jour'); refresh(); close() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  })
  const resolve = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: 'RESOLVED_BUYER' | 'RESOLVED_SELLER' }) =>
      (await api.put(`/admin/disputes/${id}/resolve`, { resolution, notes })).data,
    onSuccess: (r) => { toast.success(r.message || 'Litige résolu'); refresh(); close() },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const isOpen = selected && ['OPEN', 'IN_PROGRESS'].includes(selected.status)

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Scale size={24} className="text-primary" /> Litiges
        </h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === s ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary')}>
              {STATUS_META[s].label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
          ) : (!disputes || disputes.length === 0) ? (
            <div className="p-10 text-center text-slate-400 text-sm">Aucun litige {STATUS_META[filter]?.label.toLowerCase()}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Commande</th>
                    <th className="px-4 py-3 font-medium">Acheteur</th>
                    <th className="px-4 py-3 font-medium">Vendeur</th>
                    <th className="px-4 py-3 font-medium">Motif</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Ouvert</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d: any) => (
                    <tr key={d.id} className="border-b border-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">#{d.order?.orderNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{d.order?.buyer?.firstName} {d.order?.buyer?.lastName}</td>
                      <td className="px-4 py-3 text-slate-700">{d.order?.seller?.firstName} {d.order?.seller?.lastName}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={d.reason}>{d.reason}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{timeAgo(d.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                          <span className={cn('w-2 h-2 rounded-full', STATUS_META[d.status]?.dot)} />
                          {STATUS_META[d.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setSelected(d); setNotes('') }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-50" title="Voir / résoudre">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!selected} onClose={close} title={selected ? `Litige — commande #${selected.order?.orderNumber}` : ''} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className={cn('w-2 h-2 rounded-full', STATUS_META[selected.status]?.dot)} />
                {STATUS_META[selected.status]?.label}
              </span>
              <span className="text-slate-500">{formatPrice(selected.order?.totalAmount || 0)}</span>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Motif</div>
              <div className="text-slate-800">{selected.reason}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Description de l'acheteur</div>
              <div className="text-slate-700 whitespace-pre-line rounded-lg bg-slate-50 p-3">{selected.description || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Réponse du vendeur</div>
              <div className="text-slate-700 whitespace-pre-line rounded-lg bg-slate-50 p-3">
                {selected.sellerResponse || <span className="text-slate-400">Aucune réponse du vendeur.</span>}
              </div>
            </div>

            {selected.resolution && (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">Résolution</div>
                <div className="text-slate-700 rounded-lg bg-slate-50 p-3">{selected.resolution}</div>
              </div>
            )}

            {isOpen && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Note de résolution (visible dans la notification)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="Explication de la décision…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:border-primary focus:outline-none" />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {selected.status === 'OPEN' && (
                    <Button variant="secondary" onClick={() => inProgress.mutate(selected.id)} loading={inProgress.isPending}>
                      Marquer en cours
                    </Button>
                  )}
                  <Button variant="danger"
                    onClick={() => resolve.mutate({ id: selected.id, resolution: 'RESOLVED_BUYER' })}
                    loading={resolve.isPending}>
                    Rembourser l'acheteur
                  </Button>
                  <Button variant="primary"
                    onClick={() => resolve.mutate({ id: selected.id, resolution: 'RESOLVED_SELLER' })}
                    loading={resolve.isPending}>
                    Donner raison au vendeur
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
