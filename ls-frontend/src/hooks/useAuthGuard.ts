import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export function useAuthGuard(redirectTo = '/auth/login') {
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [_hasHydrated, isAuthenticated, router, redirectTo])

  return { user, isAuthenticated, _hasHydrated, isReady: _hasHydrated && isAuthenticated }
}
