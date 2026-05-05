'use client'
import Image from 'next/image'
import { Message } from '@/types'
import { Avatar } from '@/components/ui'
import { timeAgo, cn } from '@/lib/utils'
import { Check, CheckCheck } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  showAvatar?: boolean
}

export function MessageBubble({ message, isMine, showAvatar }: MessageBubbleProps) {
  return (
    <div className={cn('flex items-end gap-2 max-w-[80%]', isMine ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
      {showAvatar && !isMine ? (
        <Avatar
          src={message.sender?.profile?.avatarUrl}
          firstName={message.sender?.firstName}
          lastName={message.sender?.lastName}
          size="xs"
          className="flex-shrink-0 mb-1"
        />
      ) : (
        <div className="w-6 flex-shrink-0" />
      )}

      <div className={cn('rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', isMine
        ? 'bg-primary text-white rounded-br-sm'
        : 'bg-white border border-border text-dark rounded-bl-sm shadow-sm'
      )}>
        {message.imageUrl && (
          <div className="mb-1.5 rounded-xl overflow-hidden">
            <Image src={message.imageUrl} alt="Image" width={200} height={150} className="object-cover" />
          </div>
        )}
        <p className="break-words">{message.content}</p>
        <div className={cn('flex items-center justify-end gap-1 mt-0.5', isMine ? 'text-white/60' : 'text-muted')}>
          <span className="text-[10px]">{timeAgo(message.createdAt)}</span>
          {isMine && (
            message.isRead
              ? <CheckCheck size={12} className="text-white/80" />
              : <Check size={12} />
          )}
        </div>
      </div>
    </div>
  )
}
