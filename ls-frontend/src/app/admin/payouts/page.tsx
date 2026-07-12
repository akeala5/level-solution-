'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Banknote, Loader2, Check, X, CircleDollarSign } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, timeAgo, cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const STATUSES = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const
const STATUS_META: Record<string, { label: string; dot: string }> = {
  PENDING:  { label: 'En attente', dot: 'bg-amber-500' },
  APPROVED: { label: 'Validé',     dot: 'bg-blue-500' },
  PAID:     { label: 'Versé',      dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejeté',     dot: 'bg-red-500' },
}

export default function AdminPayoutsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [filter, setFilter] = useState<string>('PENDING')

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || !['ADMIN', 'MODERATOR'].includes(user?.role || ''))) {
      router.push('/')
    }
  }, [_hasHydrated, isAuthenticated, user, router])

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['admin-payouts', filter],
    queryFn: async () => (await api.get(`/wallet/admin/payouts?status=${filter}`)).data.data,
    enabled: _hasHydrated && isAuthenticated,
  })

  const processMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'APPROVE' | 'PAID' | 'REJECT' }) =>
      (await api.patch(`/wallet/admin/payouts/${id}`, { action })).data,
    onSuccess: (r) => {
      toast.success(r.message || 'Traité')
      qc.invalidateQueries({ queryKey: ['admin-payouts'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Banknote size={24} className="text-primary" /> Demandes de retrait
        </h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s} onClick={() => setFilter(s)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === s ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary',
              )}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
          ) : (!payouts || payouts.length === 0) ? (
            <div className="p-10 text-center text-slate-400 text-sm">Aucune demande {STATUS_META[filter]?.label.toLowerCase()}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Vendeur</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Montant</th>
                    <th className="px-4 py-3 font-medium">Méthode</th>
                    <th className="px-4 py-3 font-medium">Destination</th>
                    <th className="px-4 py-3 font-medium">Demandé</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p: any) => (
                    <tr key={p.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{p.seller?.sellerProfile?.shopName || `${p.seller?.firstName || ''} ${p.seller?.lastName || ''}`}</div>
                        <div className="text-xs text-slate-400">{p.seller?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatPrice(p.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{p.method === 'FEDAPAY' ? 'Mobile Money' : 'Virement'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.destination?.value || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{timeAgo(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                          <span className={cn('w-2 h-2 rounded-full', STATUS_META[p.status]?.dot)} />
                          {STATUS_META[p.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'PENDING' && (
                            <button onClick={() => processMutation.mutate({ id: p.id, action: 'APPROVE' })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="Valider">
                              <Check size={16} />
                            </button>
                          )}
                          {['PENDING', 'APPROVED'].includes(p.status) && (
                            <>
                              <button onClick={() => processMutation.mutate({ id: p.id, action: 'PAID' })}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" title="Marquer versé">
                                <CircleDollarSign size={16} />
                              </button>
                              <button onClick={() => processMutation.mutate({ id: p.id, action: 'REJECT' })}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50" title="Rejeter (restaure le solde)">
                                <X size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
