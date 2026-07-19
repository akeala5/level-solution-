'use client'
import { useRef, useEffect, useState } from 'react'
import { useInView } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Package, Users, ShoppingBag, Star } from 'lucide-react'
import api from '@/lib/api'

interface PlatformStats {
  activeProducts: number
  members: number
  completedOrders: number
  avgRating: number | null
  reviewsCount: number
}

function CountUp({ end, suffix, decimals = 0, active }: { end: number; suffix: string; decimals?: number; active: boolean }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    const duration = 1400
    const start = performance.now()
    const frame = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(parseFloat((eased * end).toFixed(decimals)))
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [active, end, decimals])
  return <>{value.toLocaleString('fr-FR')}{suffix}</>
}

export default function StatsSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const { data } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.get('/stats').then((r) => r.data.data as PlatformStats),
    staleTime: 5 * 60 * 1000,
  })

  if (!data) return <div ref={ref} className="h-24" />

  const stats = [
    { icon: Package, end: data.activeProducts, suffix: '', label: 'Annonces actives' },
    { icon: Users, end: data.members, suffix: '', label: 'Membres inscrits' },
    { icon: ShoppingBag, end: data.completedOrders, suffix: '', label: 'Transactions réussies' },
    ...(data.avgRating != null
      ? [{ icon: Star, end: data.avgRating, suffix: '/5', label: 'Satisfaction client', decimals: 1 }]
      : []),
  ]

  return (
    <section ref={ref} className="bg-card border-b border-border">
      <div className="container-custom py-8">
        <div className={`grid grid-cols-2 ${stats.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
          {stats.map(({ icon: Icon, end, suffix, label, ...rest }) => (
            <div key={label} className="flex items-center gap-3 p-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-accent/10">
                <Icon size={22} className="text-accent" />
              </div>
              <div>
                <div className="font-display font-black text-2xl leading-none text-dark">
                  <CountUp end={end} suffix={suffix} decimals={(rest as { decimals?: number }).decimals} active={inView} />
                </div>
                <div className="text-xs text-muted mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
