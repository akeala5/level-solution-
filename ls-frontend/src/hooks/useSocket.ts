import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth.store'

let globalSocket: Socket | null = null

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
        withCredentials: true, // le cookie httpOnly part dans le handshake (même origine)
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      })
    }

    socketRef.current = globalSocket

    return () => {
      // Keep socket alive across navigations — only disconnect on full unmount
    }
  }, [isAuthenticated])

  return socketRef.current
}

export function disconnectSocket() {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
  }
}
