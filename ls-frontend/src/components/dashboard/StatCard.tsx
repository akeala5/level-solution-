import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
  className?: string
}

export function StatCard({ label, value, icon: Icon, iconColor = 'text-primary', iconBg = 'bg-primary/10', trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-2xl p-4 border border-border/50 shadow-card', className)}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', iconBg)}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="text-xl font-black text-dark leading-tight">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
      {trend && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend.value >= 0 ? 'text-success' : 'text-danger')}>
          {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </div>
  )
}
