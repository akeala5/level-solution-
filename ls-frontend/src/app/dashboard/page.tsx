'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/dashboard')
      return
    }
    if (user?.role === 'SELLER' || user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
      router.replace('/dashboard/seller')
    } else {
      router.replace('/dashboard/buyer')
    }
  }, [isAuthenticated, user, router])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  )
}
