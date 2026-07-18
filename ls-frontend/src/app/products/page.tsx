'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  X, Search, ChevronDown, LayoutGrid, List,
  MapPin, Truck, RefreshCw, Zap, Package, Filter,
  Tag, DollarSign, Star, Users, SlidersHorizontal, Layers,
} from 'lucide-react'
import ProductCard from '@/components/product/ProductCard'
import api from '@/lib/api'
import { Product, Category, PaginationMeta } from '@/types'
import { cn, formatPrice } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const CONDITIONS = [
  { value: 'NEW',       label: 'Neuf' },
  { value: 'VERY_GOOD', label: 'Très bon état' },
  { value: 'GOOD',      label: 'Bon état' },
  { value: 'FAIR',      label: 'État correct' },
]

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Plus récents' },
  { value: 'popular',   label: 'Plus populaires' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc',label: 'Prix décroissant' },
]

const CITIES = ['Lomé', 'Abidjan', 'Dakar', 'Cotonou', 'Accra', 'Ouagadougou', 'Bamako', 'Conakry']
const MAX_PRICE = 2000000

// ─── Skeleton cards ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-2.5 bg-slate-200 rounded-full w-1/3" />
        <div className="h-4 bg-slate-200 rounded-full w-4/5" />
        <div className="h-4 bg-slate-200 rounded-full w-2/3" />
        <div className="h-px bg-slate-100" />
        <div className="flex justify-between">
          <div className="h-3 bg-slate-200 rounded-full w-1/3" />
          <div className="h-3 bg-slate-200 rounded-full w-1/5" />
        </div>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 animate-pulse flex gap-4 p-3">
      <div className="w-32 h-24 bg-slate-200 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 bg-slate-200 rounded-full w-1/4" />
        <div className="h-4 bg-slate-200 rounded-full w-3/5" />
        <div className="h-5 bg-slate-200 rounded-full w-1/4" />
        <div className="h-3 bg-slate-200 rounded-full w-2/5" />
      </div>
    </div>
  )
}

// ─── Product list row ─────────────────────────────────────────────────────────

function ProductRow({ product }: { product: Product }) {
  const image = product.images?.[0]?.url || product.images?.[0]?.thumbnailUrl
  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-white rounded-2xl border border-slate-100 flex gap-4 p-3 hover:shadow-md hover:border-indigo-100 transition-all group"
    >
      <div className="w-32 h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0 relative">
        {image
          ? <Image src={image} alt={product.title} fill sizes="128px" className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-slate-300" /></div>
        }
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-0.5 truncate">{product.category?.name}</p>
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1">
          {product.title}
        </h3>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-base font-bold text-indigo-600">{formatPrice(product.price)}</span>
          {product.originalPrice && <span className="text-xs text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {product.city && <span className="flex items-center gap-1"><MapPin size={10} />{product.city}</span>}
          {product.hasDelivery && <span className="flex items-center gap-1 text-emerald-600 font-medium"><Truck size={10} />Livraison</span>}
          {product.seller?.sellerProfile?.shopName && <span className="truncate">{product.seller.sellerProfile.shopName}</span>}
        </div>
      </div>
    </Link>
  )
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
      <Icon size={11} className="text-indigo-400" />
      {label}
    </p>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  filters: FilterState
  categories: Category[]
  onUpdate: (key: keyof FilterState, value: any) => void
  onClear: () => void
  onClose?: () => void
}

function Sidebar({ filters, categories, onUpdate, onClear, onClose }: SidebarProps) {
  const [localMin, setLocalMin] = useState(filters.minPrice)
  const [localMax, setLocalMax] = useState(filters.maxPrice)
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocalMin(filters.minPrice) }, [filters.minPrice])
  useEffect(() => { setLocalMax(filters.maxPrice) }, [filters.maxPrice])

  const handleMin = (v: string) => {
    setLocalMin(v)
    if (minTimer.current) clearTimeout(minTimer.current)
    minTimer.current = setTimeout(() => onUpdate('minPrice', v), 400)
  }
  const handleMax = (v: string) => {
    setLocalMax(v)
    if (maxTimer.current) clearTimeout(maxTimer.current)
    maxTimer.current = setTimeout(() => onUpdate('maxPrice', v), 400)
  }

  const sliderMax = Number(localMax) || MAX_PRICE
  const sliderPct = Math.min((sliderMax / MAX_PRICE) * 100, 100)

  const hasActive = !!(filters.condition || filters.minPrice || filters.maxPrice || filters.hasDelivery || filters.isReconditioned || filters.city || filters.sellerType || filters.minRating || filters.isFeatured)

  return (
    <aside className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <SlidersHorizontal size={14} className="text-indigo-500" />
          Filtres
          {hasActive && (
            <span className="w-4 h-4 bg-indigo-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {[filters.condition, filters.minPrice, filters.maxPrice, filters.city, filters.sellerType].filter(Boolean).length
               + (filters.hasDelivery ? 1 : 0) + (filters.isReconditioned ? 1 : 0) + (filters.isFeatured ? 1 : 0) + (filters.minRating > 0 ? 1 : 0)}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button onClick={onClear} className="text-[11px] text-rose-500 hover:underline font-medium">
              Effacer
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Catégories ── */}
        {categories.length > 0 && (
          <div>
            <SectionLabel icon={Layers} label="Catégories" />
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => onUpdate('categorySlug', '')}
                  className={cn('w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors', !filters.categorySlug ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')}
                >
                  Toutes les catégories
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => onUpdate('categorySlug', filters.categorySlug === cat.slug ? '' : cat.slug)}
                    className={cn('w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between', filters.categorySlug === cat.slug ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')}
                  >
                    <span className="truncate">{cat.name}</span>
                    {cat._count?.products !== undefined && (
                      <span className="text-[10px] text-slate-400 ml-1 shrink-0">{cat._count.products}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="h-px bg-slate-100" />

        {/* ── État ── */}
        <div>
          <SectionLabel icon={Tag} label="État du produit" />
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => onUpdate('condition', filters.condition === c.value ? '' : c.value)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all',
                  filters.condition === c.value
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* ── Prix avec slider ── */}
        <div>
          <SectionLabel icon={DollarSign} label="Plage de prix (FCFA)" />

          {/* Slider visuel max */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
              <span>0</span>
              <span className="text-indigo-600 font-semibold text-xs">
                {localMax ? formatPrice(Number(localMax)) : `${(MAX_PRICE / 1000).toFixed(0)} 000 max`}
              </span>
            </div>
            <div className="relative">
              <div className="h-1.5 bg-slate-200 rounded-full">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${sliderPct}%` }} />
              </div>
              <input
                type="range"
                min={0}
                max={MAX_PRICE}
                step={5000}
                value={Number(localMax) || MAX_PRICE}
                onChange={(e) => handleMax(e.target.value === String(MAX_PRICE) ? '' : e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Min / Max inputs */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={localMin}
              onChange={(e) => handleMin(e.target.value)}
              placeholder="Min"
              className="w-0 flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-400 placeholder:text-slate-300"
            />
            <span className="text-slate-300 text-xs shrink-0">–</span>
            <input
              type="number"
              value={localMax}
              onChange={(e) => handleMax(e.target.value)}
              placeholder="Max"
              className="w-0 flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-400 placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* ── Évaluation minimum ── */}
        <div>
          <SectionLabel icon={Star} label="Évaluation minimum" />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => onUpdate('minRating', filters.minRating === s ? 0 : s)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={20}
                  className={cn('transition-colors', s <= (filters.minRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200 hover:text-amber-300 hover:fill-amber-300')}
                />
              </button>
            ))}
            {filters.minRating > 0 && (
              <span className="text-[11px] text-slate-500 ml-1">{filters.minRating}★ et +</span>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* ── Ville ── */}
        <div>
          <SectionLabel icon={MapPin} label="Ville" />
          <div className="relative">
            <MapPin size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={filters.city}
              onChange={(e) => onUpdate('city', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-slate-700 appearance-none focus:outline-none focus:border-indigo-400 bg-white"
            >
              <option value="">Toutes les villes</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* ── Type de vendeur ── */}
        <div>
          <SectionLabel icon={Users} label="Type de vendeur" />
          <div className="flex gap-1.5">
            {[
              { value: '',             label: 'Tous' },
              { value: 'INDIVIDUAL',   label: 'Particulier' },
              { value: 'PROFESSIONAL', label: 'Pro' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => onUpdate('sellerType', t.value)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all',
                  filters.sellerType === t.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* ── Options ── */}
        <div>
          <SectionLabel icon={Filter} label="Options" />
          <div className="space-y-2">
            {[
              { key: 'hasDelivery' as const, label: 'Livraison disponible', icon: Truck, color: 'text-emerald-500' },
              { key: 'isReconditioned' as const, label: 'Reconditionné LS', icon: RefreshCw, color: 'text-orange-500' },
              { key: 'isFeatured' as const, label: 'Annonces sponsorisées', icon: Zap, color: 'text-amber-500' },
            ].map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => onUpdate(key, !filters[key])}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border',
                  filters[key]
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <div className={cn('w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors', filters[key] ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300')}>
                  {filters[key] && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <Icon size={11} className={color} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  search: string
  categorySlug: string
  condition: string
  minPrice: string
  maxPrice: string
  hasDelivery: boolean
  isReconditioned: boolean
  isFeatured: boolean
  city: string
  sellerType: string
  minRating: number
  sortBy: string
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '')

  const [filters, setFilters] = useState<FilterState>({
    search:          searchParams.get('search') || '',
    categorySlug:    searchParams.get('categorySlug') || '',
    condition:       searchParams.get('condition') || '',
    minPrice:        searchParams.get('minPrice') || '',
    maxPrice:        searchParams.get('maxPrice') || '',
    hasDelivery:     searchParams.get('hasDelivery') === 'true',
    isReconditioned: searchParams.get('isReconditioned') === 'true',
    isFeatured:      searchParams.get('isFeatured') === 'true',
    city:            searchParams.get('city') || '',
    sellerType:      searchParams.get('sellerType') || '',
    minRating:       Number(searchParams.get('minRating') || '0'),
    sortBy:          searchParams.get('sortBy') || 'newest',
  })

  // Sync → URL
  useEffect(() => {
    const p = new URLSearchParams()
    if (filters.search)          p.set('search', filters.search)
    if (filters.categorySlug)    p.set('categorySlug', filters.categorySlug)
    if (filters.condition)       p.set('condition', filters.condition)
    if (filters.minPrice)        p.set('minPrice', filters.minPrice)
    if (filters.maxPrice)        p.set('maxPrice', filters.maxPrice)
    if (filters.hasDelivery)     p.set('hasDelivery', 'true')
    if (filters.isReconditioned) p.set('isReconditioned', 'true')
    if (filters.isFeatured)      p.set('isFeatured', 'true')
    if (filters.city)            p.set('city', filters.city)
    if (filters.sellerType)      p.set('sellerType', filters.sellerType)
    if (filters.minRating > 0)   p.set('minRating', String(filters.minRating))
    if (filters.sortBy !== 'newest') p.set('sortBy', filters.sortBy)
    router.replace(`/products${p.toString() ? `?${p}` : ''}`, { scroll: false })
  }, [filters])

  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSearch = (v: string) => {
    setLocalSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => updateFilter('search', v), 300)
  }

  const clearFilters = () => {
    setLocalSearch('')
    setFilters({ search: '', categorySlug: '', condition: '', minPrice: '', maxPrice: '', hasDelivery: false, isReconditioned: false, isFeatured: false, city: '', sellerType: '', minRating: 0, sortBy: 'newest' })
  }

  const removeChip = (key: keyof FilterState) => {
    const defaults: Partial<FilterState> = { condition: '', minPrice: '', maxPrice: '', city: '', sellerType: '', hasDelivery: false, isReconditioned: false, isFeatured: false, search: '', minRating: 0 }
    updateFilter(key, defaults[key])
    if (key === 'search') setLocalSearch('')
  }

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data as { data: Category[] }),
    staleTime: 5 * 60 * 1000,
  })

  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['products', filters],
    queryFn: ({ pageParam }: { pageParam: number }) => api.get('/products', {
      params: {
        search:          filters.search || undefined,
        categorySlug:    filters.categorySlug || undefined,
        condition:       filters.condition || undefined,
        minPrice:        filters.minPrice || undefined,
        maxPrice:        filters.maxPrice || undefined,
        hasDelivery:     filters.hasDelivery || undefined,
        isReconditioned: filters.isReconditioned || undefined,
        isFeatured:      filters.isFeatured || undefined,
        city:            filters.city || undefined,
        sellerType:      filters.sellerType || undefined,
        minRating:       filters.minRating > 0 ? filters.minRating : undefined,
        sortBy:          filters.sortBy,
        page:            pageParam,
        limit:           20,
      },
    }).then((r) => r.data as { data: Product[]; meta: PaginationMeta }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.meta?.hasNextPage ? allPages.length + 1 : undefined,
    initialPageParam: 1,
  })

  const allProducts = data?.pages.flatMap((p) => p.data) ?? []
  const totalCount = data?.pages[0]?.meta?.total ?? 0

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const categories = categoriesData?.data || []

  // Chips actifs
  const chips: { key: keyof FilterState; label: string }[] = []
  if (filters.search)          chips.push({ key: 'search',          label: `"${filters.search}"` })
  if (filters.condition)       chips.push({ key: 'condition',       label: CONDITIONS.find((c) => c.value === filters.condition)?.label || filters.condition })
  if (filters.city)            chips.push({ key: 'city',            label: filters.city })
  if (filters.sellerType)      chips.push({ key: 'sellerType',      label: filters.sellerType === 'INDIVIDUAL' ? 'Particulier' : 'Professionnel' })
  if (filters.minPrice)        chips.push({ key: 'minPrice',        label: `Min ${formatPrice(Number(filters.minPrice))}` })
  if (filters.maxPrice)        chips.push({ key: 'maxPrice',        label: `Max ${formatPrice(Number(filters.maxPrice))}` })
  if (filters.hasDelivery)     chips.push({ key: 'hasDelivery',     label: 'Livraison' })
  if (filters.isReconditioned) chips.push({ key: 'isReconditioned', label: 'Reconditionné LS' })
  if (filters.isFeatured)      chips.push({ key: 'isFeatured',      label: 'Sponsorisé' })
  if (filters.minRating > 0)   chips.push({ key: 'minRating',       label: `${filters.minRating}★ et +` })

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Top bar sticky */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="container-custom py-3">
          <div className="flex items-center gap-3">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 text-sm font-medium border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 px-3 py-1.5 rounded-xl transition-all shrink-0"
            >
              <SlidersHorizontal size={14} />
              Filtres
              {chips.length > 0 && (
                <span className="w-4 h-4 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {chips.length}
                </span>
              )}
            </button>

            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-9 py-2 focus:outline-none focus:border-indigo-400 bg-slate-50 placeholder:text-slate-400 text-slate-700"
              />
              {localSearch && (
                <button onClick={() => { setLocalSearch(''); updateFilter('search', '') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative hidden sm:block shrink-0">
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 pr-8 py-2 appearance-none cursor-pointer focus:outline-none focus:border-indigo-400 bg-white text-slate-700"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* View toggle */}
            <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-700')}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-700')}
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => removeChip(chip.key)}
                  className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full hover:bg-indigo-100 transition-colors font-medium"
                >
                  {chip.label}
                  <X size={9} />
                </button>
              ))}
              {chips.length > 1 && (
                <button onClick={clearFilters} className="text-xs text-rose-500 hover:underline px-1 font-medium">
                  Tout effacer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container-custom py-6">
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <div className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="sticky top-[69px] bg-white rounded-2xl border border-slate-200 shadow-sm p-5 max-h-[calc(100vh-90px)] overflow-y-auto">
              <Sidebar filters={filters} categories={categories} onUpdate={updateFilter} onClear={clearFilters} />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Count + mobile sort */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <p className="text-sm text-slate-500 shrink-0">
                {isLoading
                  ? <span className="inline-block w-24 h-4 bg-slate-200 rounded animate-pulse" />
                  : <><span className="font-semibold text-slate-800">{totalCount.toLocaleString()}</span> annonces</>
                }
              </p>
              <div className="flex items-center gap-2 sm:hidden">
                <div className="relative">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 pr-6 py-1.5 appearance-none bg-white text-slate-700 focus:outline-none"
                  >
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              {isFetching && !isLoading && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
                  <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Mise à jour…
                </div>
              )}
            </div>

            {/* Content */}
            {isLoading ? (
              viewMode === 'grid'
                ? <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">{Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}</div>
                : <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : allProducts.length ? (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {allProducts.map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allProducts.map((p) => <ProductRow key={p.id} product={p} />)}
                  </div>
                )}

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-1 mt-4" />
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Chargement…
                  </div>
                )}
                {!hasNextPage && allProducts.length > 20 && (
                  <p className="text-center text-xs text-slate-400 py-8">— Toutes les annonces sont affichées —</p>
                )}
              </>
            ) : (
              <div className="text-center py-32">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Aucune annonce trouvée</h3>
                <p className="text-slate-500 mb-6 text-sm">Essayez de modifier vos filtres ou votre recherche</p>
                <button onClick={clearFilters} className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
                  Effacer les filtres
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40 lg:hidden" />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 lg:hidden overflow-y-auto p-5 shadow-2xl"
            >
              <Sidebar filters={filters} categories={categories} onUpdate={updateFilter} onClear={clearFilters} onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProductsPage() {
  return <Suspense><ProductsContent /></Suspense>
}
