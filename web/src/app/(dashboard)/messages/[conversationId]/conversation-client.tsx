'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageThread } from '@/components/messages/message-thread'
import { MessageInput } from '@/components/messages/message-input'
import type { Tables } from '@/types/database'

type MessageWithSender = Tables<'messages'> & {
  sender: Tables<'users'> | null
}

interface ConversationClientProps {
  conversationId: string
  initialMessages: MessageWithSender[]
  currentUserId: string
}

export function ConversationClient({
  conversationId,
  initialMessages,
  currentUserId
}: ConversationClientProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to new messages
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMessage) {
            setMessages((prev) => {
              // Check if message already exists to avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch the updated message
          const { data: updatedMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (updatedMessage) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updatedMessage.id ? updatedMessage : m
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const handleSendMessage = useCallback(async (content: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      const { message } = await response.json()

      // Add message optimistically (will be deduplicated by realtime subscription)
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev
        }
        return [...prev, message]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      throw err
    }
  }, [conversationId])

  return (
    <>
      {error && (
        <div className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {error}
        </div>
      )}
      <MessageThread messages={messages} currentUserId={currentUserId} />
      <MessageInput onSend={handleSendMessage} />
    </>
  )
}
