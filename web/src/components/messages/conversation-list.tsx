'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type ConversationWithDetails = Tables<'conversation_participants'> & {
  conversation: Tables<'conversations'> & {
    course: { name: string; code: string } | null
  } | null
  last_message?: {
    content: string
    created_at: string | null
    sender: { full_name: string | null } | null
  } | null
  unread_count: number
  other_participants: Array<{
    user: Tables<'users'> | null
  }>
}

interface ConversationListProps {
  conversations: ConversationWithDetails[]
  currentUserId: string
}

export function ConversationList({ conversations }: ConversationListProps) {
  const pathname = usePathname()

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {conversations.map((participation) => {
        const conversation = participation.conversation
        if (!conversation) return null

        const isActive = pathname === `/messages/${conversation.id}`
        const otherParticipants = participation.other_participants.filter(
          p => p.user
        )
        const displayName = conversation.title ||
          otherParticipants.map(p => p.user?.full_name || 'Unknown').join(', ') ||
          'Direct Message'

        const lastMessage = participation.last_message
        const hasUnread = participation.unread_count > 0

        return (
          <Link
            key={participation.id}
            href={`/messages/${conversation.id}`}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50',
              isActive && 'bg-muted'
            )}
          >
            <div className="relative">
              {conversation.type === 'group' || otherParticipants.length > 1 ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-medium">
                    {otherParticipants.length + 1}
                  </span>
                </div>
              ) : (
                <Avatar>
                  <AvatarImage
                    src={otherParticipants[0]?.user?.avatar_url || undefined}
                    alt={otherParticipants[0]?.user?.full_name || 'User'}
                  />
                  <AvatarFallback>
                    {getInitials(otherParticipants[0]?.user?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
              )}
              {hasUnread && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {participation.unread_count > 9 ? '9+' : participation.unread_count}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  'truncate text-sm',
                  hasUnread && 'font-semibold'
                )}>
                  {displayName}
                </span>
                {lastMessage && (
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatMessageTime(lastMessage.created_at)}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {conversation.course?.code}
              </p>

              {lastMessage && (
                <p className={cn(
                  'mt-1 truncate text-sm',
                  hasUnread ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {lastMessage.sender?.full_name ? `${lastMessage.sender.full_name}: ` : ''}
                  {lastMessage.content}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatMessageTime(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } else if (diffInDays === 1) {
    return 'Yesterday'
  } else if (diffInDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}
