'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import {
  Gavel, Clock, Users, ChevronLeft, Package, Loader2,
  TrendingUp, AlertCircle, CheckCircle, Crown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCountdown } from '@/hooks/useCountdown'
import { useAuthStore } from '@/store/auth.store'
import { Auction, AuctionBid } from '@/types'
import { formatPrice, timeAgo, cn, imgBlurDataURL } from '@/lib/utils'
import api from '@/lib/api'

// ─── Countdown display ────────────────────────────────────────────────────────
function LiveCountdown({ endsAt }: { endsAt: string }) {
  const { hours, minutes, seconds, urgency, isExpired } = useCountdown(endsAt)
  const pad = (n: number) => String(n).padStart(2, '0')

  if (isExpired) return (
    <div className="text-center py-6">
      <div className="text-4xl font-black text-red-500 mb-1">Enchère terminée</div>
    </div>
  )

  const colorClass =
    urgency === 'critical' ? 'text-red-500' :
    urgency === 'warning'  ? 'text-amber-500' :
                             'text-emerald-600'

  return (
    <div className="text-center py-4">
      <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2 flex items-center justify-center gap-1.5">
        <Clock size={12} /> Temps restant
      </p>
      <div className={cn('flex items-center justify-center gap-2 font-black tabular-nums', colorClass)}>
        {[pad(hours), pad(minutes), pad(seconds)].map((unit, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="bg-white border border-border/50 shadow-card rounded-2xl px-4 py-3 min-w-[64px] text-center">
              <span className="text-4xl leading-none">{unit}</span>
              <p className="text-[10px] text-muted font-normal mt-0.5">
                {i === 0 ? 'heure' : i === 1 ? 'min' : 'sec'}{i === 0 && hours > 1 ? 's' : ''}
              </p>
            </div>
            {i < 2 && <span className="text-3xl font-black mb-4">:</span>}
          </div>
        ))}
      </div>
      {urgency === 'critical' && (
        <p className="text-xs text-red-500 font-semibold mt-3 animate-pulse">
          ⚡ Moins d'une heure — enchérissez maintenant !
        </p>
      )}
    </div>
  )
}

// ─── Bid row ─────────────────────────────────────────────────────────────────
function BidRow({ bid, isTop, currentUserId }: { bid: AuctionBid; isTop: boolean; currentUserId?: string }) {
  const isMe = bid.bidderId === currentUserId
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center justify-between px-4 py-3 rounded-xl',
        isTop ? 'bg-amber-50 border border-amber-200' : 'bg-surface'
      )}
    >
      <div className="flex items-center gap-2">
        {isTop && <Crown size={13} className="text-amber-500 shrink-0" />}
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
          isMe ? 'bg-primary text-white' : 'bg-muted/20 text-muted'
        )}>
          {isMe ? 'Moi' : '?'}
        </div>
        <div>
          <p className="text-xs text-muted">{timeAgo(bid.createdAt)}</p>
          {bid.isAuto && <p className="text-[10px] text-muted/60">Enchère automatique</p>}
        </div>
      </div>
      <span className={cn('font-bold text-sm', isTop ? 'text-amber-700' : 'text-dark')}>
        {formatPrice(bid.amount)}
      </span>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  const [bidAmount, setBidAmount] = useState('')
  const [bidding, setBidding] = useState(false)
  const [liveBids, setLiveBids] = useState<AuctionBid[]>([])
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [auctionEnded, setAuctionEnded] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => api.get(`/auctions/${id}`).then((r) => r.data.data as Auction),
    enabled: !!id,
  })

  useEffect(() => {
    if (!data) return
    setLivePrice(data.currentPrice)
    setLiveBids(data.bids ?? [])
    setBidAmount(String(data.currentPrice + data.minBidIncrement))
  }, [data?.id])

  // WebSocket — namespace /auctions
  useEffect(() => {
    if (!id) return
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001')
    const socket = io(`${wsUrl}/auctions`, {
      query: { auctionId: id },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })
    socketRef.current = socket

    socket.on('new_bid', (payload: { bidId: string; bidderId: string; amount: number; currentPrice: number; totalBids: number; timestamp: string }) => {
      setLivePrice(payload.currentPrice)
      setLiveBids((prev) => [{
        id: payload.bidId,
        bidderId: payload.bidderId,
        amount: payload.amount,
        isAuto: false,
        createdAt: payload.timestamp,
      }, ...prev].slice(0, 20))
      setBidAmount(String(payload.currentPrice + (data?.minBidIncrement ?? 500)))
      toast.success(`Nouvelle offre : ${formatPrice(payload.currentPrice)}`)
    })

    socket.on('auction_ended', () => {
      setAuctionEnded(true)
      qc.invalidateQueries({ queryKey: ['auction', id] })
      toast('Enchère terminée !', { icon: '🔨' })
    })

    return () => { socket.disconnect() }
  }, [id])

  if (!_hasHydrated || isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertCircle size={40} className="text-muted mx-auto mb-3" />
        <p className="font-semibold text-dark mb-2">Enchère introuvable</p>
        <Link href="/auctions" className="btn-primary btn-sm">Voir les enchères</Link>
      </div>
    </div>
  )

  const auction = data
  const currentPrice = livePrice ?? auction.currentPrice
  const minNextBid = currentPrice + auction.minBidIncrement
  const isActive = auction.status === 'ACTIVE' && !auctionEnded
  const isSeller = user?.id === auction.product.seller?.id
  const image = auction.product.images?.[0]?.url
  const totalBids = liveBids.length || auction._count?.bids || 0

  const handleBid = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return }
    const amount = Number(bidAmount)
    if (isNaN(amount) || amount < minNextBid) {
      toast.error(`Offre minimum : ${formatPrice(minNextBid)}`)
      return
    }
    setBidding(true)
    try {
      await api.post(`/auctions/${id}/bids`, { amount })
      toast.success('Offre placée !')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enchère')
    } finally {
      setBidding(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-4xl">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted hover:text-dark mb-5 transition-colors">
          <ChevronLeft size={16} /> Retour aux enchères
        </button>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Image */}
            <div className="bg-white rounded-2xl overflow-hidden border border-border/50 shadow-card">
              <div className="relative aspect-[4/3] bg-surface">
                {image ? (
                  <Image
                    src={image}
                    alt={auction.product.title}
                    fill
                    className="object-contain p-4"
                    priority
                    placeholder="blur"
                    blurDataURL={imgBlurDataURL}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={48} className="text-muted/30" />
                  </div>
                )}
                {!isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-black text-2xl">TERMINÉE</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {auction.product.description && (
              <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
                <h2 className="font-bold text-dark mb-2">Description</h2>
                <p className="text-sm text-dark leading-relaxed whitespace-pre-line">
                  {auction.product.description}
                </p>
              </div>
            )}

            {/* Bid history */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-bold text-dark flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" /> Historique des offres
                </h2>
                <span className="text-xs text-muted">{totalBids} offre{totalBids > 1 ? 's' : ''}</span>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {liveBids.length === 0 ? (
                    <p className="text-center text-sm text-muted py-6">Aucune offre pour le moment — soyez le premier !</p>
                  ) : (
                    liveBids.map((bid, i) => (
                      <BidRow key={bid.id} bid={bid} isTop={i === 0} currentUserId={user?.id} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            {/* Title + status */}
            <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h1 className="font-bold text-dark text-lg leading-tight">{auction.product.title}</h1>
                <span className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-full shrink-0',
                  isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                )}>
                  {isActive ? 'En cours' : 'Terminée'}
                </span>
              </div>
              {auction.product.seller && (
                <p className="text-xs text-muted">
                  Vendu par <span className="font-medium text-dark">{auction.product.seller.firstName} {auction.product.seller.lastName}</span>
                </p>
              )}
            </div>

            {/* Countdown */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-card overflow-hidden">
              <LiveCountdown endsAt={auction.endsAt} />
              <div className="border-t border-border px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted mb-0.5">Offre actuelle</p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentPrice}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-black text-primary"
                    >
                      {formatPrice(currentPrice)}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-muted mb-0.5">
                    <Users size={11} /> {totalBids} offre{totalBids > 1 ? 's' : ''}
                  </div>
                  <p className="text-xs text-muted">Départ : {formatPrice(auction.startingPrice)}</p>
                </div>
              </div>
            </div>

            {/* Bid form */}
            {isActive && !isSeller && (
              <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
                <h2 className="font-bold text-dark mb-3 flex items-center gap-2">
                  <Gavel size={16} className="text-primary" /> Placer une offre
                </h2>
                <p className="text-xs text-muted mb-3">
                  Offre minimum : <span className="font-bold text-dark">{formatPrice(minNextBid)}</span>
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={minNextBid}
                      step={auction.minBidIncrement}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-12"
                      placeholder={String(minNextBid)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-medium">FCFA</span>
                  </div>
                  <button
                    onClick={handleBid}
                    disabled={bidding}
                    className="btn-primary gap-2 whitespace-nowrap"
                  >
                    {bidding ? <Loader2 size={15} className="animate-spin" /> : <Gavel size={15} />}
                    Enchérir
                  </button>
                </div>
                {!isAuthenticated && (
                  <p className="text-xs text-muted mt-2 text-center">
                    <Link href="/auth/login" className="text-primary hover:underline">Connectez-vous</Link> pour enchérir
                  </p>
                )}
              </div>
            )}

            {isSeller && isActive && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-sm text-amber-700 font-medium">Vous ne pouvez pas enchérir sur votre propre article.</p>
              </div>
            )}

            {!isActive && liveBids[0] && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-emerald-800 mb-1">Enchère remportée</p>
                <p className="text-emerald-700 text-sm">Prix final : <span className="font-black">{formatPrice(currentPrice)}</span></p>
              </div>
            )}

            {/* Auction details */}
            <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card text-sm space-y-2">
              <h3 className="font-bold text-dark mb-3">Détails</h3>
              {[
                { label: 'Début', value: new Date(auction.startsAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) },
                { label: 'Fin', value: new Date(auction.endsAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) },
                { label: 'Incrément min.', value: formatPrice(auction.minBidIncrement) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted">{label}</span>
                  <span className="font-medium text-dark">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
