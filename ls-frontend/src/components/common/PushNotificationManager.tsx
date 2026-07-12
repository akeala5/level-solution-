'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)))
}

export function PushNotificationManager() {
  const { isAuthenticated } = useAuthStore()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  if (!isAuthenticated || !('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) return null
  if (permission === 'denied') return null

  const subscribe = async () => {
    if (!('Notification' in window)) {
      toast.error('Votre navigateur ne supporte pas les notifications')
      return
    }

    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        toast('Notifications refusées', { icon: '🔕' })
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })

      await api.post('/notifications/push/subscribe', subscription.toJSON())
      toast.success('Notifications activées !')
    } catch (err) {
      toast.error('Impossible d\'activer les notifications')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) await subscription.unsubscribe()
      setPermission('default')
      toast('Notifications désactivées', { icon: '🔕' })
    } catch {
      toast.error('Erreur lors de la désactivation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={permission === 'granted' ? unsubscribe : subscribe}
      disabled={loading}
      className="flex items-center gap-2 text-xs text-muted hover:text-dark transition-colors"
      title={permission === 'granted' ? 'Désactiver les notifications' : 'Activer les notifications'}
    >
      {permission === 'granted'
        ? <BellOff size={14} />
        : <Bell size={14} />}
      {permission === 'granted' ? 'Notifications ON' : 'Activer notifs'}
    </button>
  )
}
