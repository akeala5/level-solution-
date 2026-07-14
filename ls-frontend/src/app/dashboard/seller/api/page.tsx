'use client'
import { useState } from 'react'
import { useConfirm } from '@/components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertTriangle, CheckCircle, Loader2, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt?: string
  createdAt: string
}

export default function ApiKeysPage() {
  const qc = useQueryClient()
  const confirmDialog = useConfirm()
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [creating, setCreating] = useState(false)

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys').then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/api-keys', { name }),
    onSuccess: (res) => {
      setCreatedKey(res.data.data.key)
      setNewKeyName('')
      setCreating(false)
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('Clé API créée')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('Clé révoquée')
    },
    onError: () => toast.error('Erreur'),
  })

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Key size={20} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark">Clés API</h1>
              <p className="text-sm text-muted">Accès programmatique à votre boutique</p>
            </div>
          </div>
          <Link href="/dashboard/seller/webhooks" className="btn-outline text-sm">
            Webhooks →
          </Link>
        </div>

        {/* Clé nouvellement créée */}
        <AnimatePresence>
          {createdKey && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-emerald-600" />
                <p className="font-semibold text-emerald-800">Clé créée — copiez-la maintenant</p>
              </div>
              <p className="text-xs text-emerald-700 mb-3">
                Cette clé ne sera <strong>jamais réaffichée</strong>. Conservez-la en lieu sûr.
              </p>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-emerald-200 px-4 py-2.5">
                <code className="flex-1 text-sm font-mono text-dark overflow-hidden">
                  {showKey ? createdKey : '•'.repeat(48)}
                </code>
                <button onClick={() => setShowKey(!showKey)} className="text-muted hover:text-dark">
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdKey); toast.success('Copié !') }}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Copy size={15} />
                </button>
              </div>
              <button onClick={() => setCreatedKey(null)} className="mt-3 text-xs text-emerald-600 hover:underline">
                J'ai copié ma clé, fermer
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Créer une clé */}
        <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card mb-6">
          <h2 className="font-semibold text-dark mb-4">Créer une clé API</h2>
          {creating ? (
            <div className="flex gap-3">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nom de la clé (ex: Mon site e-commerce)"
                className="input flex-1"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && newKeyName.trim()) createMutation.mutate(newKeyName.trim()) }}
              />
              <button
                onClick={() => { if (newKeyName.trim()) createMutation.mutate(newKeyName.trim()) }}
                disabled={!newKeyName.trim() || createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Créer'}
              </button>
              <button onClick={() => setCreating(false)} className="btn-outline">Annuler</button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800">
              <Plus size={15} /> Nouvelle clé API
            </button>
          )}
        </div>

        {/* Liste des clés */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="font-semibold text-dark">Mes clés</h2>
            <span className="text-xs text-muted">{keys.length} / 10</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center">
              <Shield size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-muted text-sm">Aucune clé API — créez-en une pour commencer</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-dark text-sm">{k.name}</span>
                      {!k.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Révoquée</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <code className="text-xs text-muted font-mono">{k.keyPrefix}••••••••••••••••••••••</code>
                      <span className="text-[10px] text-slate-300">
                        {k.lastUsedAt ? `Utilisée ${timeAgo(k.lastUsedAt)}` : 'Jamais utilisée'}
                      </span>
                    </div>
                  </div>
                  {k.isActive && (
                    <button
                      onClick={async () => {
                        if (await confirmDialog({ title: 'Révoquer cette clé ?', message: 'Les intégrations qui l\'utilisent cesseront de fonctionner immédiatement.', confirmLabel: 'Révoquer' })) revokeMutation.mutate(k.id)
                      }}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentation rapide */}
        <div className="bg-slate-800 rounded-2xl p-5 mt-6 text-white">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Key size={15} className="text-indigo-400" /> Utilisation
          </h3>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto">{`curl https://shop.lsgrouptogo.com/api/v1/products \\
  -H "X-Api-Key: lsk_votreclé..."`}</pre>
        </div>
      </div>
    </div>
  )
}
