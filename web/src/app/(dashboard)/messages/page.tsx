import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConversationList } from '@/components/messages/conversation-list'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's conversations with participants
  const { data: participations } = await supabase
    .from('conversation_participants')
    .select(`
      *,
      conversation:conversations(
        *,
        course:courses(name, code)
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  // Enrich with last message and unread count
  const enrichedParticipations = await Promise.all(
    (participations || []).map(async (participation) => {
      if (!participation.conversation) {
        return { ...participation, last_message: null, unread_count: 0, other_participants: [] }
      }

      // Get last message
      const { data: lastMessage } = await supabase
        .from('messages')
        .select(`
          content,
          created_at,
          sender:users!messages_sender_id_fkey(full_name)
        `)
        .eq('conversation_id', participation.conversation.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', participation.conversation.id)
        .is('deleted_at', null)
        .gt('created_at', participation.last_read_at || '1970-01-01')
        .neq('sender_id', user.id)

      // Get other participants
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select(`
          user:users(*)
        `)
        .eq('conversation_id', participation.conversation.id)
        .neq('user_id', user.id)
        .limit(5)

      return {
        ...participation,
        last_message: lastMessage,
        unread_count: unreadCount || 0,
        other_participants: otherParticipants || []
      }
    })
  )

  // Sort by last message time
  enrichedParticipations.sort((a, b) => {
    const aTime = a.last_message?.created_at || a.conversation?.created_at || ''
    const bTime = b.last_message?.created_at || b.conversation?.created_at || ''
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })

  // Calculate total unread
  const totalUnread = enrichedParticipations.reduce((sum, p) => sum + p.unread_count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Course conversations and direct messages
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                {totalUnread} unread
              </span>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/messages/new">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New Message
          </Link>
        </Button>
      </div>

      {enrichedParticipations.length > 0 ? (
        <Card>
          <CardContent className="p-2">
            <ConversationList
              conversations={enrichedParticipations}
              currentUserId={user.id}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-12 w-12 text-muted-foreground"
            >
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
            <p className="mt-4 text-lg font-medium">No messages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a conversation with someone in your course
            </p>
            <Button asChild className="mt-4">
              <Link href="/messages/new">Start a Conversation</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
