'use client'
import { motion } from 'framer-motion'
import { Users, Package, ShoppingBag, Star } from 'lucide-react'

const stats = [
  { icon: Package, value: '10 000+', label: 'Annonces actives', color: 'text-primary' },
  { icon: Users, value: '5 000+', label: 'Vendeurs & Acheteurs', color: 'text-accent' },
  { icon: ShoppingBag, value: '2 500+', label: 'Transactions réalisées', color: 'text-success' },
  { icon: Star, value: '4.8/5', label: 'Satisfaction client', color: 'text-warning' },
]

export default function StatsSection() {
  return (
    <section className="bg-white border-b border-border">
      <div className="container-custom py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, value, label, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 p-4"
            >
              <div className={`w-10 h-10 rounded-xl bg-surface flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className={`font-display font-bold text-xl ${color}`}>{value}</div>
                <div className="text-xs text-muted">{label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
