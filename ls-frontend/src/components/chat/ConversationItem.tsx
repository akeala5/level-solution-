'use client'
import { Conversation } from '@/types'
import { Avatar } from '@/components/ui'
import { timeAgo, truncate, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

interface ConversationItemProps {
  conversation: Conversation
  active?: boolean
  onClick?: () => void
}

export function ConversationItem({ conversation, active, onClick }: ConversationItemProps) {
  const { user } = useAuthStore()

  const otherMember = conversation.members.find((m) => m.userId !== user?.id)
  const otherUser = otherMember?.user
  const lastMessage = conversation.messages?.[0]
  const unread = conversation.unreadCount || 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
        active ? 'bg-primary/10' : 'hover:bg-surface'
      )}
    >
      <Avatar
        src={otherUser?.profile?.avatarUrl}
        firstName={otherUser?.firstName as string}
        lastName={otherUser?.lastName as string}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', unread > 0 ? 'font-bold text-dark' : 'font-medium text-dark')}>
            {otherUser?.firstName} {otherUser?.lastName}
          </span>
          {lastMessage && (
            <span className="text-[10px] text-muted flex-shrink-0">{timeAgo(lastMessage.createdAt)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={cn('text-xs truncate', unread > 0 ? 'text-dark' : 'text-muted')}>
            {lastMessage
              ? truncate(lastMessage.content, 36)
              : 'Commencer la conversation'}
          </span>
          {unread > 0 && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
