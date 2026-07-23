'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Sparkles, Loader2, Save, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { HERO_ICONS } from '@/hooks/useHeroConfig'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Slide { part1: string; highlight: string; part2: string; subtitle: string; part1En?: string; highlightEn?: string; part2En?: string; subtitleEn?: string }
interface Promo { icon: string; title: string; desc: string; cta: string; href: string }
interface Cfg { slides: Slide[]; housePromos: Promo[]; slideMs: number; rotateMs: number; slideAnim: string }

const ICONS = Object.keys(HERO_ICONS)
const inp = 'w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-dark focus:border-primary outline-none'

export default function AdminHeroPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [cfg, setCfg] = useState<Cfg | null>(null)

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || user?.role !== 'ADMIN')) router.push('/')
  }, [_hasHydrated, isAuthenticated, user, router])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-hero-config'],
    queryFn: async () => (await api.get('/hero-config')).data.data as Cfg,
    enabled: _hasHydrated && isAuthenticated,
  })
  // Sync l'état local editable depuis react-query. Via `data` (et pas un setCfg
  // dans le queryFn) pour que le cache ET le réseau peuplent toujours cfg : sinon
  // un retour cache = queryFn non rejoué = cfg null = spinner infini.
  useEffect(() => { if (data) setCfg(data) }, [data])

  const save = useMutation({
    mutationFn: async () => (await api.patch('/hero-config', cfg)).data,
    onSuccess: () => toast.success('Hero mis à jour — visible immédiatement sur l’accueil'),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erreur'),
  })

  if (!_hasHydrated || isLoading || !cfg) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const setSlide = (i: number, k: keyof Slide, v: string) => setCfg({ ...cfg, slides: cfg.slides.map((s, j) => j === i ? { ...s, [k]: v } : s) })
  const setPromo = (i: number, k: keyof Promo, v: string) => setCfg({ ...cfg, housePromos: cfg.housePromos.map((p, j) => j === i ? { ...p, [k]: v } : p) })

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-dark flex items-center gap-2"><Sparkles size={24} className="text-primary" /> Contenu du hero</h1>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-600 disabled:opacity-60">
            {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
          </button>
        </div>

        {/* Timings */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-5">
          <h2 className="font-bold text-dark mb-3 text-sm">Animations</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] text-muted">Accroche : durée/slide (ms)
              <input type="number" className={cn(inp, 'mt-0.5')} value={cfg.slideMs} onChange={(e) => setCfg({ ...cfg, slideMs: Number(e.target.value) || 7000 })} /></label>
            <label className="text-[11px] text-muted">Pubs : durée/rotation (ms)
              <input type="number" className={cn(inp, 'mt-0.5')} value={cfg.rotateMs} onChange={(e) => setCfg({ ...cfg, rotateMs: Number(e.target.value) || 6500 })} /></label>
          </div>
          <label className="block mt-3 text-[11px] text-muted">Type de transition (accroche & pubs)
            <select className={cn(inp, 'mt-0.5')} value={cfg.slideAnim || 'fade'} onChange={(e) => setCfg({ ...cfg, slideAnim: e.target.value })}>
              <option value="fade">Fondu (défaut)</option>
              <option value="slide">Glissement</option>
              <option value="zoom">Zoom léger</option>
              <option value="none">Aucune (instantané)</option>
            </select>
          </label>
        </div>

        {/* Slides */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-dark text-sm">Accroches (défilent)</h2>
            <button onClick={() => setCfg({ ...cfg, slides: [...cfg.slides, { part1: '', highlight: '', part2: '', subtitle: '' }] })}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Plus size={14} /> Ajouter</button>
          </div>
          <div className="space-y-4">
            {cfg.slides.map((s, i) => (
              <div key={i} className="border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-muted">Accroche {i + 1}</span>
                  <button onClick={() => setCfg({ ...cfg, slides: cfg.slides.filter((_, j) => j !== i) })} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input className={inp} placeholder="Début" value={s.part1} onChange={(e) => setSlide(i, 'part1', e.target.value)} />
                  <input className={inp} placeholder="Mot accentué (vert)" value={s.highlight} onChange={(e) => setSlide(i, 'highlight', e.target.value)} />
                  <input className={inp} placeholder="Fin" value={s.part2} onChange={(e) => setSlide(i, 'part2', e.target.value)} />
                </div>
                <input className={cn(inp, 'mb-2')} placeholder="Sous-titre (FR)" value={s.subtitle} onChange={(e) => setSlide(i, 'subtitle', e.target.value)} />
                <details className="text-[11px] text-muted">
                  <summary className="cursor-pointer">Version anglaise (EN)</summary>
                  <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
                    <input className={inp} placeholder="Start" value={s.part1En || ''} onChange={(e) => setSlide(i, 'part1En', e.target.value)} />
                    <input className={inp} placeholder="Highlight" value={s.highlightEn || ''} onChange={(e) => setSlide(i, 'highlightEn', e.target.value)} />
                    <input className={inp} placeholder="End" value={s.part2En || ''} onChange={(e) => setSlide(i, 'part2En', e.target.value)} />
                  </div>
                  <input className={inp} placeholder="Subtitle (EN)" value={s.subtitleEn || ''} onChange={(e) => setSlide(i, 'subtitleEn', e.target.value)} />
                </details>
              </div>
            ))}
          </div>
        </div>

        {/* House promos */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-dark text-sm">Encarts pub maison</h2>
            <button onClick={() => setCfg({ ...cfg, housePromos: [...cfg.housePromos, { icon: 'Sparkles', title: '', desc: '', cta: '', href: '/' }] })}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Plus size={14} /> Ajouter</button>
          </div>
          <div className="space-y-3">
            {cfg.housePromos.map((p, i) => (
              <div key={i} className="border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <select className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-dark" value={p.icon} onChange={(e) => setPromo(i, 'icon', e.target.value)}>
                    {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <button onClick={() => setCfg({ ...cfg, housePromos: cfg.housePromos.filter((_, j) => j !== i) })} className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                </div>
                <input className={cn(inp, 'mb-2')} placeholder="Titre" value={p.title} onChange={(e) => setPromo(i, 'title', e.target.value)} />
                <input className={cn(inp, 'mb-2')} placeholder="Description" value={p.desc} onChange={(e) => setPromo(i, 'desc', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inp} placeholder="Texte du bouton" value={p.cta} onChange={(e) => setPromo(i, 'cta', e.target.value)} />
                  <input className={inp} placeholder="Lien (ex. /pricing)" value={p.href} onChange={(e) => setPromo(i, 'href', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
