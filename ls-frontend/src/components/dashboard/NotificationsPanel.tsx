'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, ShoppingBag, MessageSquare, Star, AlertCircle, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Notification } from '@/types'
import { timeAgo, cn } from '@/lib/utils'
import api from '@/lib/api'

const TYPE_ICON: Record<string, any> = {
  ORDER_UPDATE:  ShoppingBag,
  NEW_MESSAGE:   MessageSquare,
  NEW_REVIEW:    Star,
  AUCTION_WON:   ShoppingBag,
  PRODUCT_SOLD:  ShoppingBag,
  DISPUTE:       AlertCircle,
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
    refetchInterval: 30000,
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notifications: Notification[] = data?.notifications || data || []
  const unread = notifications.filter((n) => !n.isRead).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative btn-icon text-dark/70 hover:text-dark"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-nav border border-border/50 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-dark text-sm">Notifications</h3>
              {unread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  disabled={markAllMutation.isPending}
                >
                  <Check size={12} /> Tout marquer lu
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-muted" /></div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={28} className="text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted">Aucune notification</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type] || Bell
                  return (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.isRead) markOneMutation.mutate(n.id); setOpen(false) }}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface transition-colors border-b border-border/50 last:border-0',
                        !n.isRead && 'bg-primary/5'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', !n.isRead ? 'bg-primary/10' : 'bg-surface')}>
                        <Icon size={15} className={!n.isRead ? 'text-primary' : 'text-muted'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm leading-snug', !n.isRead ? 'font-semibold text-dark' : 'text-dark')}>{n.title}</p>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
