'use client'
import { useState } from 'react'
import { useConfirm } from '@/components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Webhook, Plus, Trash2, Send, ChevronDown, CheckCircle2, XCircle,
  Loader2, ToggleLeft, ToggleRight, Copy, RefreshCw, Key,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { cn, timeAgo } from '@/lib/utils'
import Link from 'next/link'

const ALL_EVENTS = [
  { name: 'order.created', label: 'Nouvelle commande' },
  { name: 'order.paid', label: 'Paiement confirmé' },
  { name: 'order.shipped', label: 'Commande expédiée' },
  { name: 'order.delivered', label: 'Commande livrée' },
  { name: 'order.completed', label: 'Commande finalisée' },
  { name: 'order.cancelled', label: 'Commande annulée' },
]

interface Endpoint {
  id: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  failureCount: number
  createdAt: string
  _count: { deliveries: number }
}

interface Delivery {
  id: string
  event: string
  statusCode: number | null
  success: boolean
  attemptedAt: string
  response: string | null
}

export default function WebhooksPage() {
  const qc = useQueryClient()
  const confirmDialog = useConfirm()
  const [showCreate, setShowCreate] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState<string | null>(null)

  const { data: endpoints = [], isLoading } = useQuery<Endpoint[]>({
    queryKey: ['webhook-endpoints'],
    queryFn: () => api.get('/webhooks/endpoints').then((r) => r.data.data),
  })

  const { data: deliveries } = useQuery<{ data: Delivery[] }>({
    queryKey: ['webhook-deliveries', expandedId],
    queryFn: () => api.get(`/webhooks/endpoints/${expandedId}/deliveries`).then((r) => r.data),
    enabled: !!expandedId,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/webhooks/endpoints', { url: newUrl, events: newEvents }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhook-endpoints'] })
      setShowCreate(false)
      setNewUrl('')
      setNewEvents([])
      toast.success('Endpoint créé')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/endpoints/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhook-endpoints'] }); toast.success('Supprimé') },
    onError: () => toast.error('Erreur'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/webhooks/endpoints/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhook-endpoints'] }),
    onError: () => toast.error('Erreur'),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/webhooks/endpoints/${id}/test`),
    onSuccess: () => { toast.success('Test envoyé'); qc.invalidateQueries({ queryKey: ['webhook-deliveries', expandedId] }) },
    onError: () => toast.error('Endpoint inaccessible'),
  })

  const toggleEvent = (e: string) =>
    setNewEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Webhook size={20} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark">Webhooks</h1>
              <p className="text-sm text-muted">Recevez les événements de votre boutique en temps réel</p>
            </div>
          </div>
          <Link href="/dashboard/seller/api" className="btn-outline text-sm flex items-center gap-1.5">
            <Key size={13} /> Clés API
          </Link>
        </div>

        {/* Créer un endpoint */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-card mb-5">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 font-semibold text-dark text-sm">
              <Plus size={15} className="text-violet-600" /> Ajouter un endpoint
            </span>
            <ChevronDown size={15} className={cn('text-muted transition-transform', showCreate && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showCreate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4"
              >
                <div>
                  <label className="label">URL de l'endpoint (HTTPS requis)</label>
                  <input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://monsite.com/webhooks/ls"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Événements à écouter</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {ALL_EVENTS.map((ev) => (
                      <label key={ev.name} className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-all',
                        newEvents.includes(ev.name)
                          ? 'bg-violet-50 border-violet-300 text-violet-800'
                          : 'bg-surface border-border text-dark hover:border-violet-200'
                      )}>
                        <input
                          type="checkbox"
                          checked={newEvents.includes(ev.name)}
                          onChange={() => toggleEvent(ev.name)}
                          className="accent-violet-600 w-3.5 h-3.5"
                        />
                        {ev.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!newUrl || newEvents.length === 0 || createMutation.isPending}
                    className="btn-primary flex-1 justify-center"
                  >
                    {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : 'Créer l\'endpoint'}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="btn-outline">Annuler</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Liste des endpoints */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : endpoints.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-border/50 shadow-card">
            <Webhook size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-muted text-sm">Aucun endpoint configuré</p>
          </div>
        ) : (
          <div className="space-y-4">
            {endpoints.map((ep) => (
              <div key={ep.id} className="bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', ep.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                        <code className="text-sm font-mono text-dark truncate">{ep.url}</code>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {ep.events.map((e) => (
                          <span key={e} className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 font-mono">
                            {e}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                        <span>{ep._count.deliveries} livraisons</span>
                        {ep.failureCount > 0 && (
                          <span className="text-amber-600">{ep.failureCount} échec{ep.failureCount > 1 ? 's' : ''}</span>
                        )}
                        <span>Créé {timeAgo(ep.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => testMutation.mutate(ep.id)}
                        disabled={testMutation.isPending}
                        title="Envoyer un test"
                        className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center"
                      >
                        <Send size={12} />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate({ id: ep.id, isActive: !ep.isActive })}
                        title={ep.isActive ? 'Désactiver' : 'Activer'}
                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                      >
                        {ep.isActive ? <ToggleRight size={14} className="text-emerald-500" /> : <ToggleLeft size={14} />}
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirmDialog({ title: 'Supprimer cet endpoint ?', message: 'Les notifications vers cette URL cesseront immédiatement.', confirmLabel: 'Supprimer' })) deleteMutation.mutate(ep.id)
                        }}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Secret */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Secret :</span>
                      <code className="text-xs font-mono text-slate-500 flex-1 truncate">
                        {showSecret === ep.id ? ep.secret : `${ep.secret.slice(0, 16)}••••••••••••••••••••`}
                      </code>
                      <button onClick={() => setShowSecret(showSecret === ep.id ? null : ep.id)} className="text-xs text-muted hover:text-dark">
                        {showSecret === ep.id ? 'Masquer' : 'Voir'}
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(ep.secret); toast.success('Secret copié') }}
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Historique livraisons */}
                <AnimatePresence>
                  {expandedId === ep.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border/50"
                    >
                      <div className="px-5 py-3 bg-slate-50">
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Historique des livraisons</p>
                      </div>
                      {!deliveries?.data?.length ? (
                        <p className="text-center text-sm text-muted py-6">Aucune livraison</p>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {deliveries.data.map((d) => (
                            <div key={d.id} className="flex items-center justify-between px-5 py-3 text-xs">
                              <div className="flex items-center gap-2">
                                {d.success
                                  ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                  : <XCircle size={13} className="text-red-400 shrink-0" />
                                }
                                <code className="font-mono text-violet-700">{d.event}</code>
                              </div>
                              <div className="flex items-center gap-3 text-muted">
                                <span className={cn('font-mono', d.statusCode && d.statusCode < 300 ? 'text-emerald-600' : 'text-red-500')}>
                                  {d.statusCode ?? 'timeout'}
                                </span>
                                <span>{timeAgo(d.attemptedAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Doc vérification signature */}
        <div className="bg-slate-800 rounded-2xl p-5 mt-6 text-white">
          <h3 className="font-semibold mb-3 text-sm">Vérifier la signature</h3>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">{`// Node.js
const sig = req.headers['x-ls-signature']
const expected = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex')
if (sig !== expected) return res.status(401).end()`}</pre>
        </div>
      </div>
    </div>
  )
}
