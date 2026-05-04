'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Filter, SlidersHorizontal, X, Loader2, Search, ChevronDown, Grid3x3, List } from 'lucide-react'
import ProductCard from '@/components/product/ProductCard'
import api from '@/lib/api'
import { Product, PaginationMeta } from '@/types'
import { cn, formatPrice } from '@/lib/utils'

const CONDITIONS = [
  { value: '', label: 'Tous les états' },
  { value: 'NEW', label: 'Neuf' },
  { value: 'VERY_GOOD', label: 'Très bon état' },
  { value: 'GOOD', label: 'Bon état' },
  { value: 'FAIR', label: 'État correct' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'popular', label: 'Plus populaires' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
]

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    categorySlug: searchParams.get('categorySlug') || '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    hasDelivery: false,
    isReconditioned: searchParams.get('isReconditioned') === 'true',
    sortBy: 'newest',
    page: 1,
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.get('/products', { params: { ...filters, limit: 20 } }).then((r) => r.data as { data: Product[]; meta: PaginationMeta }),
    placeholderData: (prev) => prev,
  })

  const updateFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ search: '', categorySlug: '', condition: '', minPrice: '', maxPrice: '', hasDelivery: false, isReconditioned: false, sortBy: 'newest', page: 1 })
  }

  const hasActiveFilters = filters.condition || filters.minPrice || filters.maxPrice || filters.hasDelivery || filters.isReconditioned

  return (
    <div className="bg-surface min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-border">
        <div className="container-custom py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Rechercher..."
                className="input pl-10"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="input pr-8 appearance-none cursor-pointer text-sm"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn('btn-sm flex items-center gap-2', showFilters || hasActiveFilters ? 'btn-primary' : 'btn-outline')}
            >
              <SlidersHorizontal size={15} />
              Filtres
              {hasActiveFilters && <span className="w-2 h-2 bg-accent rounded-full" />}
            </button>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-border"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Condition */}
                <div>
                  <label className="label text-xs">État</label>
                  <select value={filters.condition} onChange={(e) => updateFilter('condition', e.target.value)} className="input text-sm py-2">
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Price range */}
                <div>
                  <label className="label text-xs">Prix min (FCFA)</label>
                  <input type="number" value={filters.minPrice} onChange={(e) => updateFilter('minPrice', e.target.value)} placeholder="0" className="input text-sm py-2" />
                </div>
                <div>
                  <label className="label text-xs">Prix max (FCFA)</label>
                  <input type="number" value={filters.maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)} placeholder="∞" className="input text-sm py-2" />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-2 justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filters.hasDelivery} onChange={(e) => updateFilter('hasDelivery', e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-dark">Livraison disponible</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filters.isReconditioned} onChange={(e) => updateFilter('isReconditioned', e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-dark">Reconditionné LS ✓</span>
                  </label>
                </div>
              </div>

              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 flex items-center gap-1.5 text-xs text-danger hover:underline">
                  <X size={12} /> Effacer les filtres
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <div className="container-custom py-6">
        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted">
            {isLoading ? '...' : `${data?.meta?.total?.toLocaleString() || 0} annonces`}
            {filters.search && <span> pour « {filters.search} »</span>}
          </p>
          {isFetching && !isLoading && (
            <Loader2 size={16} className="animate-spin text-muted" />
          )}
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={40} className="animate-spin text-primary" />
          </div>
        ) : data?.data?.length ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {data.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {data.meta && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={!data.meta.hasPrevPage}
                  onClick={() => updateFilter('page', filters.page - 1)}
                  className="btn-outline btn-sm disabled:opacity-40"
                >
                  Précédent
                </button>
                <span className="text-sm text-muted px-3">
                  Page {data.meta.page} / {data.meta.totalPages}
                </span>
                <button
                  disabled={!data.meta.hasNextPage}
                  onClick={() => updateFilter('page', filters.page + 1)}
                  className="btn-outline btn-sm disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-32">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="heading-sm text-dark mb-2">Aucune annonce trouvée</h3>
            <p className="text-muted mb-6">Essayez de modifier vos filtres ou votre recherche</p>
            <button onClick={clearFilters} className="btn-primary">Effacer les filtres</button>
          </div>
        )}
      </div>
    </div>
  )
}
