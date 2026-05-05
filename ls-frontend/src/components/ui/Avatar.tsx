'use client'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  firstName?: string
  lastName?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  badge?: 'online' | 'verified'
}

const sizes = {
  xs: { container: 'w-6 h-6', text: 'text-[9px]', badge: 'w-2 h-2' },
  sm: { container: 'w-8 h-8', text: 'text-xs',    badge: 'w-2.5 h-2.5' },
  md: { container: 'w-10 h-10', text: 'text-sm',  badge: 'w-3 h-3' },
  lg: { container: 'w-12 h-12', text: 'text-base', badge: 'w-3.5 h-3.5' },
  xl: { container: 'w-16 h-16', text: 'text-xl',  badge: 'w-4 h-4' },
}

export function Avatar({ src, firstName = '', lastName = '', size = 'md', className, badge }: AvatarProps) {
  const s = sizes[size]
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn('rounded-full overflow-hidden bg-primary/10 flex items-center justify-center', s.container)}>
        {src ? (
          <Image src={src} alt={`${firstName} ${lastName}`} fill className="object-cover" />
        ) : (
          <span className={cn('font-bold text-primary select-none', s.text)}>{initials}</span>
        )}
      </div>
      {badge === 'online' && (
        <span className={cn('absolute bottom-0 right-0 rounded-full bg-success border-2 border-white', s.badge)} />
      )}
      {badge === 'verified' && (
        <span className={cn('absolute bottom-0 right-0 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center', s.badge)}>
          <svg viewBox="0 0 12 12" className="w-full h-full p-[1px]" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </div>
  )
}
