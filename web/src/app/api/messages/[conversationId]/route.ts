import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ conversationId: string }>
}

// GET /api/messages/[conversationId] - Get messages for a conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a participant
    const { data: participation, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id, last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participation) {
      return NextResponse.json(
        { error: 'You are not a participant of this conversation' },
        { status: 403 }
      )
    }

    // Get pagination params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = (page - 1) * limit

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
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      )
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select(`
        *,
        user:users(*)
      `)
      .eq('conversation_id', conversationId)

    if (participantsError) {
      return NextResponse.json(
        { error: 'Failed to fetch participants', details: participantsError.message },
        { status: 500 }
      )
    }

    // Update last_read_at for current user
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    return NextResponse.json({
      conversation,
      messages: messages || [],
      participants: participants || [],
      page,
      limit,
      hasMore: (messages?.length || 0) === limit
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/messages/[conversationId] - Send a message to a conversation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a participant
    const { data: participation, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participation) {
      return NextResponse.json(
        { error: 'You are not a participant of this conversation' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content, attachments } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Validate content length
    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Message content exceeds maximum length of 10,000 characters' },
        { status: 400 }
      )
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        attachments: attachments || null
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(*)
      `)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Failed to send message', details: messageError?.message },
        { status: 500 }
      )
    }

    // Update last_read_at for sender
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({ message }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/messages/[conversationId] - Mark conversation as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update last_read_at
    const { error: updateError } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to mark as read', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
