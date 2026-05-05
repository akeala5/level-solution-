import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import Cookies from 'js-cookie'

let globalSocket: Socket | null = null

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = Cookies.get('accessToken')
    if (!token) return

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      })
    }

    socketRef.current = globalSocket

    return () => {
      // Keep socket alive across navigations — only disconnect on full unmount
    }
  }, [])

  return socketRef.current
}

export function disconnectSocket() {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
  }
}
