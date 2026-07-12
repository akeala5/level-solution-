'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, BellOff, Check, CheckCheck, Loader2, Package, ShoppingBag, Star, MessageSquare, AlertCircle, Info } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Notification } from '@/types'
import { timeAgo, cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const TYPE_ICON: Record<string, any> = {
  ORDER_STATUS: ShoppingBag,
  NEW_MESSAGE: MessageSquare,
  NEW_REVIEW: Star,
  PRODUCT_SOLD: Package,
  PAYMENT_RECEIVED: ShoppingBag,
  DISPUTE: AlertCircle,
  SYSTEM: Info,
}

const TYPE_COLOR: Record<string, string> = {
  ORDER_STATUS: 'bg-blue-100 text-blue-600',
  NEW_MESSAGE: 'bg-purple-100 text-purple-600',
  NEW_REVIEW: 'bg-amber-100 text-amber-600',
  PRODUCT_SOLD: 'bg-green-100 text-green-600',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-600',
  DISPUTE: 'bg-red-100 text-red-600',
  SYSTEM: 'bg-gray-100 text-gray-600',
}

export default function NotificationsPage() {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated } = useAuthStore()
  const qc = useQueryClient()

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/auth/login?redirect=/notifications')
  }, [_hasHydrated, isAuthenticated, router])

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=50').then((r) => r.data.data),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Toutes les notifications marquées comme lues')
    },
  })

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const notifications: Notification[] = data?.notifications || data || []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom max-w-2xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="heading-sm text-dark flex items-center gap-2">
              <Bell size={22} />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-muted text-sm mt-1">
              {notifications.length === 0 ? 'Aucune notification' : `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50"
            >
              <CheckCheck size={16} />
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-32">
            <BellOff size={48} className="text-muted mx-auto mb-4" />
            <h3 className="font-semibold text-dark mb-1">Aucune notification</h3>
            <p className="text-muted text-sm">Vous serez notifié ici des nouvelles activités.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif, i) => {
              const Icon = TYPE_ICON[notif.type] || Bell
              const colorClass = TYPE_COLOR[notif.type] || 'bg-gray-100 text-gray-600'
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => !notif.isRead && markOneMutation.mutate(notif.id)}
                  className={cn(
                    'bg-white rounded-2xl p-4 border border-border/50 flex gap-3 cursor-pointer transition-all hover:shadow-card',
                    !notif.isRead && 'border-primary/20 bg-primary/5'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colorClass)}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium', notif.isRead ? 'text-dark' : 'text-dark font-semibold')}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted mt-0.5 leading-relaxed">{notif.body}</p>
                    <p className="text-xs text-muted/70 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                  {notif.isRead && (
                    <Check size={14} className="text-muted flex-shrink-0 mt-1" />
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
