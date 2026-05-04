'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2, TrendingUp, Clock, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import ProductCard from '@/components/product/ProductCard'
import api from '@/lib/api'
import { Product } from '@/types'
import { useState } from 'react'

const tabs = [
  { key: 'newest', label: 'Nouveautés', icon: Clock },
  { key: 'popular', label: 'Populaires', icon: TrendingUp },
  { key: 'reconditioned', label: 'Reconditionné LS', icon: Shield },
]

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h2 className="heading-md text-dark mb-1">Annonces à la une</h2>
            <p className="text-muted text-sm">Les meilleures offres du moment</p>
          </div>
          <Link href="/products" className="btn-outline btn-sm shrink-0">
            Voir tout <ArrowRight size={14} />
          </Link>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === key
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface text-muted hover:bg-primary-50 hover:text-primary'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : data?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted">
            <p>Aucune annonce pour le moment</p>
          </div>
        )}
      </div>
    </section>
  )
}
