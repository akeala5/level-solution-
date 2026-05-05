import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: number
  className?: string
  label?: string
  fullPage?: boolean
}

export function Spinner({ size = 24, className, label, fullPage }: SpinnerProps) {
  const inner = (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 size={size} className="animate-spin text-primary" />
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        {inner}
      </div>
    )
  }

  return inner
}
