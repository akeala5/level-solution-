'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag, Loader2, Eye, Check, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { timeAgo, cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const STATUSES = ['PENDING', 'REVIEWING', 'ACTIONED', 'DISMISSED'] as const
const STATUS_META: Record<string, { label: string; dot: string }> = {
  PENDING:   { label: 'En attente', dot: 'bg-amber-500' },
  REVIEWING: { label: 'En examen',  dot: 'bg-blue-500' },
  ACTIONED:  { label: 'Traité',     dot: 'bg-emerald-500' },
  DISMISSED: { label: 'Rejeté',     dot: 'bg-slate-400' },
}
const REASON_LABEL: Record<string, string> = {
  SCAM: 'Arnaque', COUNTERFEIT: 'Contrefaçon', PROHIBITED: 'Interdit',
  OFFENSIVE: 'Offensant', SPAM: 'Spam', OTHER: 'Autre',
}
const TARGET_LABEL: Record<string, string> = { PRODUCT: 'Annonce', USER: 'Utilisateur', REVIEW: 'Avis' }

export default function AdminReportsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [filter, setFilter] = useState<string>('PENDING')

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || !['ADMIN', 'MODERATOR'].includes(user?.role || ''))) {
      router.push('/')
    }
  }, [_hasHydrated, isAuthenticated, user, router])

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-reports', filter],
    queryFn: async () => (await api.get(`/reports/admin?status=${filter}`)).data.data,
    enabled: _hasHydrated && isAuthenticated,
  })

  const handleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'REVIEWING' | 'ACTIONED' | 'DISMISSED' }) =>
      (await api.patch(`/reports/admin/${id}`, { status })).data,
    onSuccess: (r) => {
      toast.success(r.message || 'Mis à jour')
      qc.invalidateQueries({ queryKey: ['admin-reports'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Flag size={24} className="text-primary" /> Signalements
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
          ) : (!reports || reports.length === 0) ? (
            <div className="p-10 text-center text-slate-400 text-sm">Aucun signalement {STATUS_META[filter]?.label.toLowerCase()}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Signalé par</th>
                    <th className="px-4 py-3 font-medium">Cible</th>
                    <th className="px-4 py-3 font-medium">Motif</th>
                    <th className="px-4 py-3 font-medium">Détails</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any) => (
                    <tr key={r.id} className="border-b border-slate-50 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 whitespace-nowrap">{r.reporter?.firstName} {r.reporter?.lastName}</div>
                        <div className="text-xs text-slate-400">{r.reporter?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block text-xs font-medium text-slate-500">{TARGET_LABEL[r.targetType] || r.targetType}</span>
                        <div className="text-slate-800 max-w-[220px] truncate" title={r.targetLabel || r.targetId}>{r.targetLabel || r.targetId}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{REASON_LABEL[r.reason] || r.reason}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[240px]">
                        <div className="line-clamp-2">{r.description || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{timeAgo(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                          <span className={cn('w-2 h-2 rounded-full', STATUS_META[r.status]?.dot)} />
                          {STATUS_META[r.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'PENDING' && (
                            <button onClick={() => handleMutation.mutate({ id: r.id, status: 'REVIEWING' })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="Marquer en examen">
                              <Eye size={16} />
                            </button>
                          )}
                          {['PENDING', 'REVIEWING'].includes(r.status) && (
                            <>
                              <button onClick={() => handleMutation.mutate({ id: r.id, status: 'ACTIONED' })}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" title="Marquer traité (action prise)">
                                <Check size={16} />
                              </button>
                              <button onClick={() => handleMutation.mutate({ id: r.id, status: 'DISMISSED' })}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50" title="Rejeter (sans suite)">
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
