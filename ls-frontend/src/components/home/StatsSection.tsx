'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Users, Package, ShoppingBag, Star } from 'lucide-react'

const stats = [
  { icon: Package,     end: 10000, suffix: '+',  label: 'Annonces actives',       color: 'text-primary',  bg: 'bg-primary/10' },
  { icon: Users,       end: 5000,  suffix: '+',  label: 'Vendeurs & Acheteurs',   color: 'text-accent',   bg: 'bg-accent/10' },
  { icon: ShoppingBag, end: 2500,  suffix: '+',  label: 'Transactions réalisées', color: 'text-success',  bg: 'bg-success/10' },
  { icon: Star,        end: 4.8,   suffix: '/5', label: 'Satisfaction client',    color: 'text-warning',  bg: 'bg-amber-50',  decimals: 1 },
]

function CountUp({ end, suffix, decimals = 0, active }: { end: number; suffix: string; decimals?: number; active: boolean }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    const duration = 1800
    const startTime = performance.now()
    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(parseFloat((eased * end).toFixed(decimals)))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [active, end, decimals])

  return <>{decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString()}{suffix}</>
}

export default function StatsSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="bg-white border-b border-border">
      <div className="container-custom py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, end, suffix, label, color, bg, decimals }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 p-4"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={22} className={color} />
              </div>
              <div>
                <div className={`font-display font-black text-2xl leading-none ${color}`}>
                  <CountUp end={end} suffix={suffix} decimals={decimals} active={inView} />
                </div>
                <div className="text-xs text-muted mt-0.5">{label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
