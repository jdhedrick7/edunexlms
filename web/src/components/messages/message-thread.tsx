'use client'

import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type MessageWithSender = Tables<'messages'> & {
  sender: Tables<'users'> | null
}

interface MessageThreadProps {
  messages: MessageWithSender[]
  currentUserId: string
}

export function MessageThread({ messages, currentUserId }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground">No messages yet</p>
        <p className="text-sm text-muted-foreground">Start the conversation by sending a message</p>
      </div>
    )
  }

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{date}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {dateMessages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUserId
            const showAvatar = !isCurrentUser && (
              index === 0 ||
              dateMessages[index - 1]?.sender_id !== message.sender_id
            )
            const isDeleted = !!message.deleted_at

            return (
              <div
                key={message.id}
                className={cn(
                  'flex items-end gap-2',
                  isCurrentUser && 'flex-row-reverse'
                )}
              >
                {!isCurrentUser && (
                  <div className="w-8">
                    {showAvatar && (
                      <Avatar size="sm">
                        <AvatarImage
                          src={message.sender?.avatar_url || undefined}
                          alt={message.sender?.full_name || 'User'}
                        />
                        <AvatarFallback>
                          {getInitials(message.sender?.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    'flex max-w-[70%] flex-col gap-1',
                    isCurrentUser && 'items-end'
                  )}
                >
                  {showAvatar && !isCurrentUser && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {message.sender?.full_name || 'Unknown User'}
                    </span>
                  )}

                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2',
                      isCurrentUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                      isDeleted && 'italic opacity-60'
                    )}
                  >
                    {isDeleted ? (
                      <span className="text-sm">This message was deleted</span>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                  </div>

                  <div className={cn(
                    'flex items-center gap-2 text-xs text-muted-foreground',
                    isCurrentUser && 'flex-row-reverse'
                  )}>
                    <span>
                      {formatMessageTime(message.created_at || '')}
                    </span>
                    {message.edited_at && !isDeleted && (
                      <span>(edited)</span>
                    )}
                  </div>
                </div>

                {isCurrentUser && <div className="w-8" />}
              </div>
            )
          })}
        </div>
      ))}
      <div ref={bottomRef} />
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

function formatMessageTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function groupMessagesByDate(messages: MessageWithSender[]): Record<string, MessageWithSender[]> {
  const groups: Record<string, MessageWithSender[]> = {}

  messages.forEach(message => {
    if (!message.created_at) return

    const date = new Date(message.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let dateKey: string
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday'
    } else {
      dateKey = date.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(message)
  })

  return groups
}
