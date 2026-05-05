import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { useSocket } from './useSocket'

export function useNotifications() {
  const socket = useSocket()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!socket || !isAuthenticated) return

    const handler = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    }

    socket.on('notification', handler)
    return () => { socket.off('notification', handler) }
  }, [socket, isAuthenticated, qc])
}
