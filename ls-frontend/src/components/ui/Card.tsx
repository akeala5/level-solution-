import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padded?: boolean
}

export function Card({ hover = false, padded = true, className, children, ...props }: CardProps) {
  return (
    <div className={cn(hover ? 'card-hover' : 'card', padded && 'p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-bold text-dark', className)} {...props}>
      {children}
    </h3>
  )
}
