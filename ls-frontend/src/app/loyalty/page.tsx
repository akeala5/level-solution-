'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Star, Gift, TrendingUp, Award, ChevronRight, Loader2, Zap, Shield, Crown } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, timeAgo, cn } from '@/lib/utils'
import api from '@/lib/api'
import type { LoyaltyAccount } from '@/types'
import toast from 'react-hot-toast'

const LEVELS = [
  { level: 'BRONZE',   min: 0,    max: 499,  color: 'from-amber-600 to-amber-800',   icon: '🥉', perks: ['1 point / 1 000 FCFA dépensé', 'Accès aux ventes flash'] },
  { level: 'SILVER',   min: 500,  max: 1999, color: 'from-slate-400 to-slate-600',   icon: '🥈', perks: ['1 point / 1 000 FCFA', '-5% sur les frais', 'Support prioritaire'] },
  { level: 'GOLD',     min: 2000, max: 4999, color: 'from-yellow-400 to-yellow-600', icon: '🥇', perks: ['1,5 pts / 1 000 FCFA', '-10% frais', 'Badge GOLD vendeur', 'Annonces boostées ×2'] },
  { level: 'PLATINUM', min: 5000, max: Infinity, color: 'from-cyan-400 to-blue-600', icon: '💎', perks: ['2 pts / 1 000 FCFA', '-15% frais', 'Badge PLATINUM', 'Gestionnaire dédié', 'Accès bêta features'] },
]

const REWARDS = [
  { points: 100, label: 'Bon -500 FCFA',     value: 500,   icon: '🎫' },
  { points: 200, label: 'Bon -1 000 FCFA',   value: 1000,  icon: '🎟️' },
  { points: 500, label: 'Bon -2 500 FCFA',   value: 2500,  icon: '💳' },
  { points: 1000, label: 'Bon -5 000 FCFA',  value: 5000,  icon: '🎁' },
  { points: 2000, label: 'Bon -10 000 FCFA', value: 10000, icon: '👑' },
]

export default function LoyaltyPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'rewards'>('overview')

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/auth/login?redirect=/loyalty')
  }, [_hasHydrated, isAuthenticated, router])

  const { data: loyaltyData, isLoading } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.get('/users/me/loyalty').then((r) => r.data.data),
    enabled: isAuthenticated,
  })

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => api.get('/users/me/loyalty/transactions?limit=30').then((r) => r.data.data),
    enabled: isAuthenticated && activeTab === 'history',
  })

  const redeemMutation = useMutation({
    mutationFn: (points: number) => api.post('/users/me/loyalty/redeem', { points }),
    onSuccess: (res) => {
      toast.success(`Bon de réduction généré : ${res.data.data?.voucherCode}`)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Solde insuffisant'),
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const loyalty: LoyaltyAccount = loyaltyData || { points: 0, level: 'BRONZE' }
  const currentLevel = LEVELS.find((l) => l.level === loyalty.level) || LEVELS[0]
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1]
  const progressPct = nextLevel
    ? Math.min(100, ((loyalty.points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-3xl">

        {/* Header hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${currentLevel.color} rounded-3xl p-8 text-white mb-6 relative overflow-hidden`}
        >
          <div className="absolute -top-8 -right-8 text-[120px] opacity-10 select-none">{currentLevel.icon}</div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl">{currentLevel.icon}</span>
              <div>
                <p className="text-white/70 text-sm uppercase tracking-widest">Niveau actuel</p>
                <h1 className="text-3xl font-black">{loyalty.level}</h1>
              </div>
            </div>

            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-black">{loyalty.points.toLocaleString()}</span>
              <span className="text-white/70 mb-1">points</span>
            </div>

            {nextLevel && (
              <>
                <div className="w-full bg-white/20 rounded-full h-2 mb-1.5">
                  <div
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-white/70 text-xs">
                  {(nextLevel.min - loyalty.points).toLocaleString()} points pour atteindre {nextLevel.icon} {nextLevel.level}
                </p>
              </>
            )}
            {!nextLevel && (
              <p className="text-white/90 text-sm font-semibold">🎉 Niveau maximum atteint !</p>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border/50 rounded-2xl p-1 mb-5 shadow-card w-fit">
          {[
            { id: 'overview', label: 'Aperçu', icon: Star },
            { id: 'rewards',  label: 'Récompenses', icon: Gift },
            { id: 'history',  label: 'Historique', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                activeTab === id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-dark hover:bg-surface'
              )}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Avantages niveau actuel */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-card p-5">
              <h2 className="font-bold text-dark mb-3 flex items-center gap-2">
                <Award size={16} className="text-primary" /> Avantages {loyalty.level}
              </h2>
              <ul className="space-y-2">
                {currentLevel.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-dark">
                    <Zap size={13} className="text-accent flex-shrink-0" /> {perk}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tous les niveaux */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-dark">Progression des niveaux</h2>
              </div>
              {LEVELS.map((lvl) => {
                const isActive = lvl.level === loyalty.level
                const isPast = LEVELS.indexOf(lvl) < LEVELS.indexOf(currentLevel)
                return (
                  <div key={lvl.level}
                    className={cn('flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0',
                      isActive && 'bg-primary/5'
                    )}>
                    <span className="text-2xl">{lvl.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-bold text-sm', isActive ? 'text-primary' : isPast ? 'text-success' : 'text-muted')}>
                          {lvl.level}
                        </span>
                        {isActive && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">Actuel</span>}
                        {isPast && <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full">Atteint</span>}
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {lvl.min === 0 ? '0' : lvl.min.toLocaleString()} — {lvl.max === Infinity ? '∞' : lvl.max.toLocaleString()} pts
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-muted" />
                  </div>
                )
              })}
            </div>

            {/* Comment gagner */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-card p-5">
              <h2 className="font-bold text-dark mb-3 flex items-center gap-2">
                <Shield size={16} className="text-primary" /> Comment gagner des points
              </h2>
              <div className="space-y-3">
                {[
                  { action: 'Achat confirmé', pts: '1 pt / 1 000 FCFA' },
                  { action: 'Laisser un avis', pts: '+5 pts' },
                  { action: 'Parrainage accepté', pts: '+50 pts' },
                  { action: 'Profil KYC vérifié', pts: '+100 pts' },
                  { action: 'Première vente (vendeur)', pts: '+20 pts' },
                ].map(({ action, pts }) => (
                  <div key={action} className="flex items-center justify-between text-sm">
                    <span className="text-dark">{action}</span>
                    <span className="font-bold text-accent">{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REWARDS */}
        {activeTab === 'rewards' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Échangez vos points contre des bons de réduction (1 point = 5 FCFA).
              Votre solde actuel : <strong className="text-dark">{loyalty.points.toLocaleString()} pts</strong>
            </p>
            {REWARDS.map((reward) => {
              const canRedeem = loyalty.points >= reward.points
              return (
                <motion.div
                  key={reward.points}
                  whileHover={canRedeem ? { scale: 1.01 } : {}}
                  className={cn('bg-white rounded-2xl border shadow-card p-4 flex items-center gap-4',
                    canRedeem ? 'border-border/50' : 'border-border/30 opacity-60'
                  )}
                >
                  <span className="text-3xl">{reward.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-dark">{reward.label}</p>
                    <p className="text-xs text-muted">{reward.points.toLocaleString()} points requis</p>
                  </div>
                  <button
                    onClick={() => redeemMutation.mutate(reward.points)}
                    disabled={!canRedeem || redeemMutation.isPending}
                    className={cn('btn-sm', canRedeem ? 'btn-primary' : 'btn-outline opacity-50 cursor-not-allowed')}
                  >
                    {redeemMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Échanger'}
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div>
            {histLoading ? (
              <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-muted" /></div>
            ) : !historyData?.transactions?.length ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-border/50">
                <Crown size={36} className="text-muted mx-auto mb-3" />
                <p className="font-semibold text-dark">Aucune transaction</p>
                <p className="text-muted text-sm mt-1">Effectuez des achats pour gagner des points.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden">
                {historyData.transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-0">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0',
                      tx.points > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    )}>
                      {tx.points > 0 ? '+' : ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark truncate">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted">{timeAgo(tx.createdAt)}</p>
                    </div>
                    <span className={cn('font-bold text-sm', tx.points > 0 ? 'text-success' : 'text-danger')}>
                      {tx.points > 0 ? '+' : ''}{tx.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
