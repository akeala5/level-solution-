'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Grid3x3, Loader2, ChevronRight, Package } from 'lucide-react'
import api from '@/lib/api'
import { Category } from '@/types'

export default function CategoriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => api.get('/categories').then((r) => r.data.data as Category[]),
  })

  const rootCategories = data?.filter((c) => !c.parentId) || []

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-gradient-primary text-white">
        <div className="container-custom py-10">
          <div className="flex items-center gap-3 mb-2">
            <Grid3x3 size={20} className="text-accent" />
            <h1 className="heading-sm text-white">Toutes les catégories</h1>
          </div>
          <p className="text-white/70 text-sm">
            Parcourez nos catégories d'équipements informatiques
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-muted" />
          </div>
        ) : rootCategories.length === 0 ? (
          <div className="text-center py-20">
            <Package size={40} className="text-muted mx-auto mb-3" />
            <p className="text-muted">Aucune catégorie disponible</p>
          </div>
        ) : (
          <div className="space-y-8">
            {rootCategories.map((cat, idx) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                {/* Root category header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {cat.iconUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-border shadow-sm flex-shrink-0">
                        <Image src={cat.iconUrl} alt={cat.name} width={40} height={40} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package size={18} className="text-primary" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-dark">{cat.name}</h2>
                      {cat._count && (
                        <p className="text-xs text-muted">{cat._count.products} annonce{cat._count.products > 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/products?categorySlug=${cat.slug}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Voir tout <ChevronRight size={13} />
                  </Link>
                </div>

                {/* Subcategories grid */}
                {cat.children && cat.children.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/products?categorySlug=${sub.slug}`}
                        className="bg-white rounded-2xl p-4 border border-border/50 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all group text-center"
                      >
                        {sub.imageUrl ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-2 border border-border">
                            <Image src={sub.imageUrl} alt={sub.name} width={48} height={48} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/20 transition-colors">
                            <Package size={20} className="text-primary" />
                          </div>
                        )}
                        <p className="text-xs font-semibold text-dark group-hover:text-primary transition-colors leading-tight">
                          {sub.name}
                        </p>
                        {sub._count && (
                          <p className="text-xs text-muted mt-0.5">{sub._count.products}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  /* No subcategories — show root as direct link card */
                  <Link
                    href={`/products?categorySlug=${cat.slug}`}
                    className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-border/50 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all text-sm font-medium text-dark hover:text-primary"
                  >
                    Voir les annonces <ChevronRight size={14} />
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
