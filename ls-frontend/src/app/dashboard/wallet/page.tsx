'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet, ArrowDownToLine, Clock, TrendingUp, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, timeAgo, cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const PAYOUT_STATUS: Record<string, { label: string; dot: string }> = {
  PENDING:  { label: 'En attente', dot: 'bg-amber-500' },
  APPROVED: { label: 'Validé',     dot: 'bg-blue-500' },
  PAID:     { label: 'Versé',      dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejeté',     dot: 'bg-red-500' },
}

const TX_LABEL: Record<string, string> = {
  CREDIT: 'Vente', PAYOUT: 'Retrait', REFUND_CREDIT: 'Remboursement', REFUND_DEBIT: 'Ajustement',
}

export default function WalletPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('FEDAPAY')
  const [destination, setDestination] = useState('')

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/wallet')
  }, [_hasHydrated, isAuthenticated, router])

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await api.get('/wallet')).data.data,
    enabled: _hasHydrated && isAuthenticated,
  })

  const { data: payouts } = useQuery({
    queryKey: ['my-payouts'],
    queryFn: async () => (await api.get('/wallet/payouts')).data.data,
    enabled: _hasHydrated && isAuthenticated,
  })

  const payoutMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/wallet/payout', {
        amount: Number(amount),
        method,
        destination: { value: destination },
      })).data,
    onSuccess: () => {
      toast.success('Demande de retrait enregistrée')
      setAmount(''); setDestination('')
      qc.invalidateQueries({ queryKey: ['wallet'] })
      qc.invalidateQueries({ queryKey: ['my-payouts'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur lors de la demande'),
  })

  const balance = wallet?.balance ?? 0
  const canSubmit = Number(amount) >= 1000 && Number(amount) <= balance && destination.trim().length > 0 && !payoutMutation.isPending

  if (!_hasHydrated || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Wallet size={24} className="text-primary" /> Mon portefeuille
        </h1>

        {/* Cartes récap — structure neutre, valeur en couleur de donnée */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Wallet size={16} /> Solde disponible</div>
            <div className="text-2xl font-bold text-slate-900">{formatPrice(balance)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Clock size={16} /> Retraits en attente</div>
            <div className="text-2xl font-bold text-slate-900">{formatPrice(wallet?.pendingPayouts ?? 0)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><TrendingUp size={16} /> Total encaissé</div>
            <div className="text-2xl font-bold text-slate-900">{formatPrice(wallet?.totalEarned ?? 0)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demande de retrait */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><ArrowDownToLine size={18} className="text-primary" /> Demander un retrait</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Montant (XOF)</label>
                <input
                  type="number" min={1000} value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="Min. 1 000"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <p className="text-xs text-slate-400 mt-1">Disponible : {formatPrice(balance)}</p>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Méthode</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="FEDAPAY">Mobile Money (FedaPay)</option>
                  <option value="BANK_TRANSFER">Virement bancaire</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">{method === 'FEDAPAY' ? 'N° Mobile Money' : 'IBAN / coordonnées'}</label>
                <input
                  type="text" value={destination} onChange={(e) => setDestination(e.target.value)}
                  placeholder={method === 'FEDAPAY' ? '+228 …' : 'TG…'}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <button
                onClick={() => payoutMutation.mutate()} disabled={!canSubmit}
                className={cn(
                  'w-full rounded-xl px-4 py-2.5 font-medium text-white transition-colors',
                  canSubmit ? 'bg-primary hover:bg-primary-700' : 'bg-slate-300 cursor-not-allowed',
                )}
              >
                {payoutMutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Demander le retrait'}
              </button>
              {Number(amount) > balance && <p className="text-xs text-red-600">Montant supérieur au solde disponible.</p>}
            </div>
          </div>

          {/* Historique des retraits */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Mes demandes de retrait</h2>
            {(!payouts || payouts.length === 0) ? (
              <p className="text-sm text-slate-400">Aucune demande pour l'instant.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {payouts.map((p: any) => (
                  <li key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{formatPrice(p.amount)}</div>
                      <div className="text-xs text-slate-400">{p.method === 'FEDAPAY' ? 'Mobile Money' : 'Virement'} · {timeAgo(p.createdAt)}</div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className={cn('w-2 h-2 rounded-full', PAYOUT_STATUS[p.status]?.dot || 'bg-slate-400')} />
                      {PAYOUT_STATUS[p.status]?.label || p.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Derniers mouvements */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-6">
          <h2 className="font-semibold text-slate-900 mb-4">Derniers mouvements</h2>
          {(!wallet?.lastTransactions || wallet.lastTransactions.length === 0) ? (
            <p className="text-sm text-slate-400">Aucun mouvement.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {wallet.lastTransactions.map((t: any) => {
                const isCredit = t.type === 'CREDIT' || t.type === 'REFUND_CREDIT'
                return (
                  <li key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{t.label}</div>
                      <div className="text-xs text-slate-400">{TX_LABEL[t.type] || t.type} · {timeAgo(t.createdAt)}</div>
                    </div>
                    <span className={cn('font-semibold', isCredit ? 'text-emerald-600' : 'text-slate-700')}>
                      {isCredit ? '+' : '−'}{formatPrice(t.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
