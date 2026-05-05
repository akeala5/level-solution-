'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { Spinner } from '@/components/ui'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'BUYER' | 'SELLER' | 'ADMIN' | 'MODERATOR'
  redirectTo?: string
}

export function AuthGuard({ children, requiredRole, redirectTo = '/auth/login' }: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuthStore()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace(`${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (requiredRole && user?.role !== requiredRole && user?.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router, redirectTo, requiredRole])

  if (isLoading || !isAuthenticated) {
    return <Spinner fullPage label="Chargement..." />
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'ADMIN') {
    return <Spinner fullPage />
  }

  return <>{children}</>
}
