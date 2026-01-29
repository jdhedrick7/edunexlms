import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConversationClient } from './conversation-client'

interface PageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user is a participant
  const { data: participation, error: participantError } = await supabase
    .from('conversation_participants')
    .select('id, last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (participantError || !participation) {
    notFound()
  }

  // Get conversation details
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select(`
      *,
      course:courses(id, name, code)
    `)
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    notFound()
  }

  // Get messages
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  // Get all participants
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select(`
      *,
      user:users(*)
    `)
    .eq('conversation_id', conversationId)

  // Update last_read_at for current user
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)

  // Get other participants for header
  const otherParticipants = (participants || []).filter(p => p.user && p.user_id !== user.id)
  const displayTitle = conversation.title ||
    otherParticipants.map(p => p.user?.full_name || 'Unknown').join(', ') ||
    'Conversation'

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="mr-1">
            <Link href="/messages">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className="sr-only">Back to messages</span>
            </Link>
          </Button>

          {conversation.type === 'group' || otherParticipants.length > 1 ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-sm font-medium">
                {(participants?.length || 0)}
              </span>
            </div>
          ) : otherParticipants[0]?.user ? (
            <Avatar>
              <AvatarImage
                src={otherParticipants[0].user.avatar_url || undefined}
                alt={otherParticipants[0].user.full_name || 'User'}
              />
              <AvatarFallback>
                {getInitials(otherParticipants[0].user.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
          ) : null}

          <div>
            <h1 className="font-semibold">{displayTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {conversation.course?.code} - {conversation.course?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {otherParticipants.length > 0 && (
            <div className="flex -space-x-2">
              {otherParticipants.slice(0, 3).map((p) => (
                <Avatar key={p.id} size="sm" className="border-2 border-background">
                  <AvatarImage
                    src={p.user?.avatar_url || undefined}
                    alt={p.user?.full_name || 'User'}
                  />
                  <AvatarFallback>
                    {getInitials(p.user?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
              ))}
              {otherParticipants.length > 3 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                  +{otherParticipants.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages and input */}
      <ConversationClient
        conversationId={conversationId}
        initialMessages={messages || []}
        currentUserId={user.id}
      />
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
