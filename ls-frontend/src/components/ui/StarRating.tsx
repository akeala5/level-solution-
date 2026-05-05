'use client'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  max?: number
  onChange?: (v: number) => void
  size?: number
  className?: string
  showValue?: boolean
}

export function StarRating({ value, max = 5, onChange, size = 16, className, showValue }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const interactive = !!onChange

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = (interactive ? hovered || value : value) > i
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(i + 1)}
            onMouseEnter={() => interactive && setHovered(i + 1)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={cn('transition-transform', interactive && 'hover:scale-110 cursor-pointer', !interactive && 'cursor-default')}
          >
            <Star
              size={size}
              className={cn(filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300', interactive && !filled && 'hover:text-amber-300')}
            />
          </button>
        )
      })}
      {showValue && <span className="ml-1 text-sm font-semibold text-dark">{value.toFixed(1)}</span>}
    </div>
  )
}
