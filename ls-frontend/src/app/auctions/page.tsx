'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Gavel, Clock, Users, TrendingUp, Package, Loader2, Flame } from 'lucide-react'
import { useCountdown } from '@/hooks/useCountdown'
import { Auction } from '@/types'
import { formatPrice, cn, imgBlurDataURL } from '@/lib/utils'
import api from '@/lib/api'

function CountdownBadge({ endsAt }: { endsAt: string }) {
  const { formatted, urgency, isExpired } = useCountdown(endsAt)
  if (isExpired) return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
      <Clock size={11} /> Terminée
    </span>
  )
  return (
    <span className={cn(
      'flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg tabular-nums',
      urgency === 'critical' ? 'text-red-600 bg-red-50 animate-pulse' :
      urgency === 'warning'  ? 'text-amber-600 bg-amber-50' :
                               'text-emerald-700 bg-emerald-50'
    )}>
      <Clock size={11} /> {formatted}
    </span>
  )
}

function AuctionCard({ auction }: { auction: Auction }) {
  const image = auction.product.images?.[0]?.url
  const bidsCount = auction._count?.bids ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={`/auctions/${auction.id}`}
        className="block bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden group hover:border-primary/40 hover:shadow-lg transition-all"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] bg-surface overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={auction.product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={imgBlurDataURL}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={36} className="text-muted/30" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <CountdownBadge endsAt={auction.endsAt} />
          </div>
          {bidsCount > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 text-xs font-semibold text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg">
              <Users size={11} /> {bidsCount} offre{bidsCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-dark text-sm line-clamp-2 mb-3 group-hover:text-primary transition-colors">
            {auction.product.title}
          </h3>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted mb-0.5">Offre actuelle</p>
              <p className="text-xl font-black text-primary">{formatPrice(auction.currentPrice)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted mb-0.5">Mise de départ</p>
              <p className="text-sm text-muted line-through">{formatPrice(auction.startingPrice)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted">
              Enchère min. +{formatPrice(auction.minBidIncrement)}
            </span>
            <span className="text-xs font-semibold text-primary group-hover:underline">
              Enchérir →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function AuctionsPage() {
  const [status, setStatus] = useState<'ACTIVE' | 'ENDED'>('ACTIVE')

  const { data, isLoading } = useQuery({
    queryKey: ['auctions', status],
    queryFn: () => api.get('/auctions', { params: { status, limit: 24 } })
      .then((r) => r.data.data as { auctions: Auction[]; total: number }),
    refetchInterval: 30_000,
  })

  const auctions = data?.auctions ?? []

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Gavel size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="heading-sm text-dark">Enchères en direct</h1>
            <p className="text-muted text-sm">Faites vos offres avant la fin du compte à rebours</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border/50 rounded-2xl p-1 my-5 shadow-card w-fit">
          {([
            { key: 'ACTIVE', label: 'En cours', icon: Flame },
            { key: 'ENDED',  label: 'Terminées', icon: TrendingUp },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                status === key ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-dark hover:bg-surface'
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : auctions.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-border/50">
            <Gavel size={40} className="text-muted mx-auto mb-3" />
            <p className="font-semibold text-dark mb-1">
              {status === 'ACTIVE' ? 'Aucune enchère en cours' : 'Aucune enchère terminée'}
            </p>
            <p className="text-muted text-sm">Revenez bientôt pour de nouvelles ventes aux enchères.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.map((a) => <AuctionCard key={a.id} auction={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}
