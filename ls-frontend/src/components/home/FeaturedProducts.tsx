'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, TrendingUp, Clock, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import ProductCard from '@/components/product/ProductCard'
import api from '@/lib/api'
import { Product } from '@/types'
import { useState } from 'react'

const tabs = [
  { key: 'newest',        label: 'Nouveautés',      icon: Clock },
  { key: 'popular',       label: 'Populaires',       icon: TrendingUp },
  { key: 'reconditioned', label: 'Reconditionné LS', icon: Shield },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-2.5 bg-slate-200 rounded-full w-1/3" />
        <div className="h-4 bg-slate-200 rounded-full w-4/5" />
        <div className="h-4 bg-slate-200 rounded-full w-2/3" />
        <div className="h-px bg-slate-100" />
        <div className="flex items-center justify-between">
          <div className="h-3 bg-slate-200 rounded-full w-1/3" />
          <div className="h-3 bg-slate-200 rounded-full w-1/5" />
        </div>
      </div>
    </div>
  )
}

export default function FeaturedProducts() {
  const [activeTab, setActiveTab] = useState('newest')

  const params = activeTab === 'reconditioned'
    ? { isReconditioned: true, limit: 8 }
    : { sortBy: activeTab, limit: 8 }

  const { data, isLoading } = useQuery({
    queryKey: ['featured-products', activeTab],
    queryFn: () => api.get('/products', { params }).then((r) => r.data.data as Product[]),
  })

  return (
    <section className="section">
      <div className="container-custom">
        {/* Header — centré */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-7"
        >
          <span className="inline-block text-xs uppercase tracking-widest text-indigo-500 font-semibold mb-2">
            Sélection du moment
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1.5">
            Annonces à la une
          </h2>
          <p className="text-slate-500 text-sm">Les meilleures offres du moment</p>
        </motion.div>

        {/* Tabs — centrés */}
        <div className="flex items-center justify-center gap-2 mb-7 flex-wrap">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                activeTab === key
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Grid with skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : data?.length ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* CTA centré */}
            <div className="text-center mt-8">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 text-sm font-medium px-6 py-2.5 rounded-xl transition-all"
              >
                Voir toutes les annonces <ArrowRight size={14} />
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-slate-400 text-sm">
            Aucune annonce pour le moment
          </div>
        )}
      </div>
    </section>
  )
}
