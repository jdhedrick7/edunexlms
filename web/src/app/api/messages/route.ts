import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/messages - List conversations for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get pagination params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const offset = (page - 1) * limit

    // Get user's conversations with participants and last message
    const { data: participations, error } = await supabase
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
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch conversations', details: error.message },
        { status: 500 }
      )
    }

    // Enrich with last message and unread count for each conversation
    const enrichedParticipations = await Promise.all(
      (participations || []).map(async (participation) => {
        if (!participation.conversation) return participation

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
    type EnrichedParticipation = typeof enrichedParticipations[number]
    enrichedParticipations.sort((a: EnrichedParticipation, b: EnrichedParticipation) => {
      const aEnriched = a as EnrichedParticipation & { last_message?: { created_at?: string | null } }
      const bEnriched = b as EnrichedParticipation & { last_message?: { created_at?: string | null } }
      const aTime = aEnriched.last_message?.created_at || a.conversation?.created_at || ''
      const bTime = bEnriched.last_message?.created_at || b.conversation?.created_at || ''
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return NextResponse.json({
      conversations: enrichedParticipations,
      page,
      limit,
      hasMore: (participations?.length || 0) === limit
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/messages - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { course_id, recipient_ids, title, initial_message, type = 'direct' } = body

    // Validate required fields
    if (!course_id) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      )
    }

    if (!recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      )
    }

    if (!initial_message || typeof initial_message !== 'string' || !initial_message.trim()) {
      return NextResponse.json(
        { error: 'Initial message is required' },
        { status: 400 }
      )
    }

    // Verify user is enrolled in the course
    const { data: userEnrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('user_id', user.id)
      .single()

    if (enrollError || !userEnrollment) {
      return NextResponse.json(
        { error: 'You must be enrolled in the course to start a conversation' },
        { status: 403 }
      )
    }

    // Verify all recipients are enrolled in the course
    const { data: recipientEnrollments, error: recipientError } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', course_id)
      .in('user_id', recipient_ids)

    if (recipientError) {
      return NextResponse.json(
        { error: 'Failed to verify recipients' },
        { status: 500 }
      )
    }

    const enrolledRecipientIds = recipientEnrollments?.map(e => e.user_id) || []
    const invalidRecipients = recipient_ids.filter((id: string) => !enrolledRecipientIds.includes(id))

    if (invalidRecipients.length > 0) {
      return NextResponse.json(
        { error: 'Some recipients are not enrolled in the course' },
        { status: 400 }
      )
    }

    // For direct messages, check if conversation already exists
    if (type === 'direct' && recipient_ids.length === 1) {
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select(`
          id,
          conversation_participants!inner(user_id)
        `)
        .eq('course_id', course_id)
        .eq('type', 'direct')

      // Find a conversation that has exactly these two participants
      if (existingConversation) {
        for (const conv of existingConversation) {
          const participantIds = (conv as unknown as { conversation_participants: Array<{ user_id: string }> }).conversation_participants.map((p: { user_id: string }) => p.user_id)
          if (
            participantIds.length === 2 &&
            participantIds.includes(user.id) &&
            participantIds.includes(recipient_ids[0])
          ) {
            // Add the message to existing conversation
            const { error: messageError } = await supabase
              .from('messages')
              .insert({
                conversation_id: conv.id,
                sender_id: user.id,
                content: initial_message.trim()
              })

            if (messageError) {
              return NextResponse.json(
                { error: 'Failed to send message' },
                { status: 500 }
              )
            }

            return NextResponse.json({
              conversation_id: conv.id,
              is_new: false
            })
          }
        }
      }
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        course_id,
        title: title || null,
        type: recipient_ids.length > 1 ? 'group' : type,
        created_by: user.id
      })
      .select()
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Failed to create conversation', details: convError?.message },
        { status: 500 }
      )
    }

    // Add all participants (including the creator)
    const allParticipants = [user.id, ...recipient_ids]
    const participantInserts = allParticipants.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === user.id ? 'owner' : 'member',
      last_read_at: userId === user.id ? new Date().toISOString() : null
    }))

    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert(participantInserts)

    if (participantError) {
      // Rollback conversation creation
      await supabase.from('conversations').delete().eq('id', conversation.id)
      return NextResponse.json(
        { error: 'Failed to add participants', details: participantError.message },
        { status: 500 }
      )
    }

    // Send the initial message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: initial_message.trim()
      })

    if (messageError) {
      return NextResponse.json(
        { error: 'Conversation created but failed to send initial message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      conversation_id: conversation.id,
      is_new: true
    }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
