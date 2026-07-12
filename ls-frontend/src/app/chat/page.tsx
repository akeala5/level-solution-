'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Send, Search, MessageSquare, Loader2, ArrowLeft,
  Image as ImageIcon, Package, MoreVertical
} from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth.store'
import { Conversation, Message } from '@/types'
import { cn, timeAgo, initials } from '@/lib/utils'
import api from '@/lib/api'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

let socket: Socket | null = null

function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sellerId = searchParams.get('seller')
  const productId = searchParams.get('product')
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const qc = useQueryClient()

  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/auth/login?redirect=/chat')
    }
  }, [_hasHydrated, isAuthenticated, router])

  // Init socket
  useEffect(() => {
    const token = Cookies.get('accessToken')
    if (!token) return

    const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    socket = io(`${wsBase}/chat`, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [isAuthenticated])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversations
  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/chat/conversations').then((r) => r.data.data as Conversation[]),
    enabled: isAuthenticated,
    refetchInterval: 60000,
  })

  // Start or open conversation with seller
  useEffect(() => {
    if (!sellerId || !isAuthenticated) return
    const start = async () => {
      try {
        const res = await api.post('/chat/conversations', {
          otherUserId: sellerId,
          productId: productId || undefined,
        })
        const conv = res.data.data
        setActiveConvId(conv.id)
        qc.invalidateQueries({ queryKey: ['conversations'] })
      } catch (err: any) {
        console.error('Error starting conversation', err)
        toast.error(err.response?.data?.message || 'Impossible de démarrer la conversation')
      }
    }
    start()
  }, [sellerId, productId, isAuthenticated])

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) return
    const load = async () => {
      try {
        const res = await api.get(`/chat/conversations/${activeConvId}/messages`)
        setMessages(res.data.data as Message[])
        // joining also marks as read (handled server-side)
        socket?.emit('join_conversation', { conversationId: activeConvId })
      } catch (err: any) {
        console.error('Error loading messages', err)
        toast.error(err.response?.data?.message || 'Impossible de charger les messages')
      }
    }
    load()
  }, [activeConvId])

  const handleSelectConv = (conv: Conversation) => {
    setActiveConvId(conv.id)
    socket?.emit('join_conversation', { conversationId: conv.id })
  }

  const handleSend = async () => {
    if (!message.trim() || !activeConvId || sending) return
    const content = message.trim()
    setMessage('')
    setSending(true)

    // Optimistic
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: activeConvId,
      senderId: user!.id,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const res = await api.post(`/chat/conversations/${activeConvId}/messages`, { content })
      const saved = res.data.data as Message
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? saved : m)))
      qc.invalidateQueries({ queryKey: ['conversations'] })
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
      setMessage(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const conversations = convData || []
  const filtered = conversations.filter((c) => {
    const other = c.members?.find((m) => m.userId !== user?.id)
    const name = `${other?.user?.firstName || ''} ${other?.user?.lastName || ''}`.toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  const activeConv = conversations.find((c) => c.id === activeConvId)
  const otherUser = activeConv?.members?.find((m) => m.userId !== user?.id)?.user

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  return (
    <div className="h-[calc(100vh-64px)] bg-surface flex">
      {/* Sidebar — conversations */}
      <div className={cn(
        'w-full md:w-80 lg:w-96 bg-white border-r border-border flex flex-col flex-shrink-0',
        activeConvId ? 'hidden md:flex' : 'flex'
      )}>
        <div className="p-4 border-b border-border">
          <h1 className="font-bold text-dark text-lg mb-3">Messages</h1>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="input pl-9 text-sm py-2"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <MessageSquare size={32} className="text-muted mx-auto mb-3" />
              <p className="text-muted text-sm">Aucune conversation</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const other = conv.members?.find((m) => m.userId !== user?.id)?.user
              const lastMsg = conv.messages?.[conv.messages.length - 1]
              const isActive = conv.id === activeConvId
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 hover:bg-surface transition-colors text-left border-b border-border/50',
                    isActive && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {other?.profile?.avatarUrl ? (
                      <Image src={other.profile.avatarUrl} alt="" width={44} height={44} className="rounded-full object-cover" />
                    ) : (
                      initials(other?.firstName || '?', other?.lastName || '')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-dark text-sm truncate">
                        {other?.firstName} {other?.lastName}
                      </span>
                      <span className="text-xs text-muted flex-shrink-0">
                        {lastMsg ? timeAgo(lastMsg.createdAt) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {lastMsg?.content || 'Démarrer une conversation'}
                    </p>
                  </div>
                  {(conv.unreadCount || 0) > 0 && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={cn(
        'flex-1 flex flex-col',
        !activeConvId ? 'hidden md:flex' : 'flex'
      )}>
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="text-muted mx-auto mb-4" />
              <h2 className="font-semibold text-dark mb-1">Sélectionnez une conversation</h2>
              <p className="text-muted text-sm">Choisissez une conversation dans la liste</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setActiveConvId(null)}
                className="md:hidden w-8 h-8 rounded-lg border border-border flex items-center justify-center"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {initials(otherUser?.firstName || '?', otherUser?.lastName || '')}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-dark text-sm">
                  {otherUser?.firstName} {otherUser?.lastName}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isMe = msg.senderId === user?.id
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                        isMe
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-white text-dark border border-border rounded-bl-md shadow-sm'
                      )}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <p className={cn('text-xs mt-1', isMe ? 'text-white/60' : 'text-muted')}>
                          {timeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Écrire un message..."
                  className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return <Suspense><ChatContent /></Suspense>
}
