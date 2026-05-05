import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('bg-white rounded-2xl p-12 text-center border border-border/50', className)}>
      <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-muted" />
      </div>
      <p className="font-semibold text-dark mb-1">{title}</p>
      {description && <p className="text-muted text-sm mb-4 max-w-xs mx-auto">{description}</p>}
      {action && (
        action.href ? (
          <Link href={action.href} className="btn-primary btn-sm">{action.label}</Link>
        ) : (
          <button onClick={action.onClick} className="btn-primary btn-sm">{action.label}</button>
        )
      )}
    </div>
  )
}
