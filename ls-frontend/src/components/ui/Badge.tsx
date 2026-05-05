import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'accent' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

const variants = {
  default:  'bg-gray-100 text-gray-700',
  success:  'bg-success/10 text-success',
  warning:  'bg-amber-100 text-amber-700',
  danger:   'bg-red-100 text-red-700',
  primary:  'bg-primary/10 text-primary',
  accent:   'bg-accent/10 text-accent',
  outline:  'border border-border text-muted',
}

const sizes = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-semibold', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}

export function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    NEW:       { label: 'Neuf',          variant: 'success' },
    VERY_GOOD: { label: 'Très bon état', variant: 'primary' },
    GOOD:      { label: 'Bon état',      variant: 'accent' },
    FAIR:      { label: 'État correct',  variant: 'warning' },
    FOR_PARTS: { label: 'Pour pièces',   variant: 'danger' },
  }
  const c = map[condition] || { label: condition, variant: 'default' as const }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    PENDING:           { label: 'En attente',     variant: 'warning' },
    PAYMENT_CONFIRMED: { label: 'Payé',            variant: 'primary' },
    PROCESSING:        { label: 'En préparation',  variant: 'primary' },
    SHIPPED:           { label: 'Expédié',          variant: 'accent' },
    DELIVERED:         { label: 'Livré',            variant: 'success' },
    COMPLETED:         { label: 'Terminé',          variant: 'success' },
    CANCELLED:         { label: 'Annulé',           variant: 'danger' },
    REFUNDED:          { label: 'Remboursé',        variant: 'accent' },
    DISPUTED:          { label: 'Litige',           variant: 'danger' },
    PUBLISHED:         { label: 'Actif',            variant: 'success' },
    DRAFT:             { label: 'Brouillon',        variant: 'default' },
    SOLD:              { label: 'Vendu',            variant: 'warning' },
    SUSPENDED:         { label: 'Suspendu',         variant: 'danger' },
  }
  const s = map[status] || { label: status, variant: 'default' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
