'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, TrendingUp, Loader2, BarChart2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface HeatmapEntry {
  query: string
  count: number
}

function sizeClass(rank: number, max: number): string {
  const ratio = rank / max
  if (ratio >= 0.8) return 'text-3xl font-black text-indigo-700'
  if (ratio >= 0.6) return 'text-2xl font-bold text-indigo-600'
  if (ratio >= 0.4) return 'text-xl font-bold text-indigo-500'
  if (ratio >= 0.25) return 'text-base font-semibold text-indigo-400'
  return 'text-sm font-medium text-slate-500'
}

function bgClass(rank: number, max: number): string {
  const ratio = rank / max
  if (ratio >= 0.8) return 'bg-indigo-100 border-indigo-300'
  if (ratio >= 0.6) return 'bg-indigo-50 border-indigo-200'
  if (ratio >= 0.4) return 'bg-slate-100 border-slate-200'
  return 'bg-slate-50 border-slate-100'
}

export default function AdminHeatmapPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || !['ADMIN', 'MODERATOR'].includes(user?.role || ''))) {
      router.push('/')
    }
  }, [_hasHydrated, isAuthenticated, user, router])

  const { data, isLoading } = useQuery<HeatmapEntry[]>({
    queryKey: ['admin-search-heatmap'],
    queryFn: () => api.get('/search-alerts/admin/heatmap').then((r) => r.data.data),
    enabled: isAuthenticated && ['ADMIN', 'MODERATOR'].includes(user?.role || ''),
    refetchInterval: 60_000,
  })

  const maxCount = data?.[0]?.count ?? 1

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-custom py-8 max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BarChart2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Heatmap des recherches</h1>
              <p className="text-xs text-slate-400">Termes les plus recherchés par les utilisateurs</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : !data?.length ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Search size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune alerte de recherche enregistrée</p>
            <p className="text-xs text-slate-400 mt-1">Les données apparaîtront dès que des utilisateurs créeront des alertes</p>
          </div>
        ) : (
          <>
            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-2xl font-black text-indigo-600">{data.length}</p>
                <p className="text-xs text-slate-500 mt-1">Termes uniques</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-2xl font-black text-indigo-600">{data[0]?.query}</p>
                <p className="text-xs text-slate-500 mt-1">Terme #1</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <p className="text-2xl font-black text-slate-900">{maxCount}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">Max alertes sur un terme</p>
              </div>
            </div>

            {/* Tag cloud */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 mb-8">
              <h2 className="text-sm font-bold text-slate-700 mb-6">Nuage de mots</h2>
              <div className="flex flex-wrap gap-3 items-center justify-center min-h-[200px]">
                {data.map((entry, i) => (
                  <motion.span
                    key={entry.query}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    title={`${entry.count} alerte${entry.count > 1 ? 's' : ''}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-default select-none ${sizeClass(entry.count, maxCount)} ${bgClass(entry.count, maxCount)}`}
                  >
                    {entry.query}
                    <span className="text-[10px] opacity-60 font-normal">×{entry.count}</span>
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Bar chart list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-700">Top 20 termes</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {data.slice(0, 20).map((entry, i) => (
                  <div key={entry.query} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-xs text-slate-400 w-5 text-right shrink-0">#{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{entry.query}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${(entry.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-8 text-right shrink-0">{entry.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
