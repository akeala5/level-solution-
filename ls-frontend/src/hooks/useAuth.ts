import { useAuthStore } from '@/store/auth.store'

export function useAuth() {
  const store = useAuthStore()

  const isSeller = store.user?.role === 'SELLER' || store.user?.role === 'ADMIN'
  const isAdmin = store.user?.role === 'ADMIN'
  const isModerator = store.user?.role === 'MODERATOR' || store.user?.role === 'ADMIN'
  const fullName = store.user ? `${store.user.firstName} ${store.user.lastName}` : ''

  return {
    ...store,
    isSeller,
    isAdmin,
    isModerator,
    fullName,
  }
}
