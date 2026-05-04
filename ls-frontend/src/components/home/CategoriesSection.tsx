'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Laptop, Cpu, Wifi, Monitor, Package, Smartphone, Shield, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

const categories = [
  { name: 'Ordinateurs', nameEn: 'Computers', slug: 'ordinateurs', icon: Laptop, color: 'from-blue-500 to-blue-600', bg: 'from-blue-50 to-blue-100', count: '3 200+' },
  { name: 'Composants', nameEn: 'Components', slug: 'composants', icon: Cpu, color: 'from-purple-500 to-purple-600', bg: 'from-purple-50 to-purple-100', count: '1 800+' },
  { name: 'Réseau & Serveurs', nameEn: 'Network', slug: 'reseau-serveurs', icon: Wifi, color: 'from-green-500 to-green-600', bg: 'from-green-50 to-green-100', count: '900+' },
  { name: 'Périphériques', nameEn: 'Peripherals', slug: 'peripheriques', icon: Monitor, color: 'from-orange-500 to-orange-600', bg: 'from-orange-50 to-orange-100', count: '1 400+' },
  { name: 'Accessoires', nameEn: 'Accessories', slug: 'accessoires', icon: Package, color: 'from-pink-500 to-pink-600', bg: 'from-pink-50 to-pink-100', count: '2 100+' },
  { name: 'Mobiles & Tablettes', nameEn: 'Mobile', slug: 'mobiles-tablettes', icon: Smartphone, color: 'from-cyan-500 to-cyan-600', bg: 'from-cyan-50 to-cyan-100', count: '600+' },
  { name: 'Logiciels', nameEn: 'Software', slug: 'logiciels-licences', icon: Tag, color: 'from-indigo-500 to-indigo-600', bg: 'from-indigo-50 to-indigo-100', count: '400+' },
  { name: 'Reconditionné LS', nameEn: 'LS Refurb.', slug: 'reconditionne-ls', icon: Shield, color: 'from-accent to-accent-600', bg: 'from-accent-50 to-accent-100', count: '800+', featured: true },
]

export default function CategoriesSection() {
  return (
    <section className="section bg-surface">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="heading-md text-dark mb-2">Parcourir par catégorie</h2>
          <p className="text-muted">Trouvez exactement ce que vous cherchez</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/products?categorySlug=${cat.slug}`}
                className={cn(
                  'group relative flex flex-col items-center p-4 md:p-5 rounded-2xl border transition-all duration-300',
                  'bg-white hover:shadow-card-hover hover:-translate-y-1 border-border/50',
                  cat.featured && 'border-accent/30 bg-gradient-to-b from-white to-accent-50/30'
                )}
              >
                {cat.featured && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    Certifié LS
                  </span>
                )}
                <div className={cn(
                  'w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-sm transition-transform group-hover:scale-110',
                  cat.color
                )}>
                  <cat.icon size={24} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-dark text-center leading-snug group-hover:text-primary transition-colors">
                  {cat.name}
                </span>
                <span className="text-xs text-muted mt-1">{cat.count} annonces</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
