'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { useState, useEffect } from 'react'
import { ConfirmProvider } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'

function StoreHydration() {
  useEffect(() => {
    useAuthStore.persist.rehydrate()
    useCartStore.persist.rehydrate()
  }, [])
  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // 5 min — évite les refetch inutiles
        gcTime:    10 * 60 * 1000, // 10 min en cache mémoire
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  }))

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <StoreHydration />
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
