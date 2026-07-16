import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'
import api, { clearTokens } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  setUser: (user: User | null) => void
  setLoading: (v: boolean) => void
  login: (user: User) => void
  logout: () => void
  updateUser: (data: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (isLoading) => set({ isLoading }),
      // Les cookies httpOnly d'auth sont déjà posés par le backend (Set-Cookie).
      // Le store ne conserve que l'identité utilisateur, jamais de token.
      login: (user) => {
        set({ user, isAuthenticated: true })
      },
      logout: () => {
        // Invalide la session côté serveur : efface les cookies httpOnly
        // + annule le refreshToken en base. Fire-and-forget (redirect immédiat côté appelant).
        api.post('/auth/logout').catch(() => {})
        clearTokens()
        set({ user: null, isAuthenticated: false })
      },
      updateUser: (data) =>
        set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
    }),
    {
      name: 'ls-auth',
      skipHydration: true,
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => { state?.setHasHydrated(true) },
    }
  )
)
