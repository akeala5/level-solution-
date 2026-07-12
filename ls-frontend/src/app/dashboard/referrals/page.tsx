'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, Gift, Copy, Check, ExternalLink,
  Share2, Loader2, TrendingUp, UserPlus
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, timeAgo } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface ReferralStats {
  code: string | null
  referralLink: string | null
  totalReferrals: number
  totalRewards: number
  referrals: {
    id: string
    firstName: string
    lastName: string
    joinedAt: string
    reward: number | null
  }[]
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copié !`)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  )
}

export default function ReferralsPage() {
  const { isAuthenticated } = useAuthStore()

  const { data, isLoading } = useQuery<ReferralStats>({
    queryKey: ['referrals-me'],
    queryFn: () => api.get('/referrals/me').then((r) => r.data.data),
    enabled: isAuthenticated,
  })

  const handleShare = async () => {
    if (!data?.referralLink) return
    if (navigator.share) {
      await navigator.share({
        title: 'Rejoins LS Marketplace',
        text: 'Inscris-toi sur LS Marketplace avec mon lien de parrainage !',
        url: data.referralLink,
      })
    } else {
      await navigator.clipboard.writeText(data.referralLink)
      toast.success('Lien copié !')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="container-custom py-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Programme de parrainage</h1>
          <p className="text-sm text-slate-500">Invitez vos amis et gagnez des récompenses ensemble</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Users size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{data?.totalReferrals ?? 0}</p>
              <p className="text-xs text-slate-500">Filleuls inscrits</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Gift size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{formatPrice(data?.totalRewards ?? 0)}</p>
              <p className="text-xs text-slate-500">Récompenses gagnées</p>
            </div>
          </div>
        </div>

        {/* Referral link card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} />
            <span className="font-bold text-sm">Votre lien de parrainage</span>
          </div>

          {data?.code ? (
            <>
              {/* Code */}
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] text-indigo-200 mb-0.5">Code</p>
                  <p className="font-mono font-black text-lg tracking-widest">{data.code}</p>
                </div>
                <CopyButton text={data.code} label="Code" />
              </div>

              {/* Full link */}
              <div className="bg-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 mb-4">
                <p className="text-xs text-indigo-100 truncate flex-1">{data.referralLink}</p>
                <CopyButton text={data.referralLink!} label="Lien" />
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold text-sm py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
              >
                <Share2 size={15} />
                Partager mon lien
              </button>
            </>
          ) : (
            <p className="text-indigo-200 text-sm">Aucun code de parrainage disponible pour le moment.</p>
          )}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Comment ça marche ?</h2>
          <ol className="space-y-3">
            {[
              { n: '1', text: 'Partagez votre lien ou code unique avec vos amis' },
              { n: '2', text: 'Vos amis s\'inscrivent en utilisant votre code' },
              { n: '3', text: 'Vous gagnez une récompense dès leur première commande' },
            ].map((step) => (
              <li key={step.n} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.n}
                </span>
                <p className="text-sm text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Referral list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Mes filleuls</h2>
            <span className="text-xs text-slate-400">{data?.totalReferrals ?? 0} au total</span>
          </div>

          {!data?.referrals.length ? (
            <div className="flex flex-col items-center py-12 text-center px-6">
              <UserPlus size={36} className="text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Aucun filleul pour l'instant</p>
              <p className="text-xs text-slate-400 mt-1">Partagez votre lien pour commencer à parrainer</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {data.referrals.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                    {r.firstName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {r.firstName} {r.lastName}
                    </p>
                    <p className="text-[11px] text-slate-400">{timeAgo(r.joinedAt)}</p>
                  </div>
                  {r.reward ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      +{formatPrice(r.reward)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                      En attente
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </motion.div>
    </div>
  )
}
