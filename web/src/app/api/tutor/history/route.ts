import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface HistoryQuery {
  limit?: number
  offset?: number
  courseId?: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const params: HistoryQuery = {
    limit: Math.min(parseInt(searchParams.get('limit') || '50', 10), 100),
    offset: parseInt(searchParams.get('offset') || '0', 10),
    courseId: searchParams.get('courseId') || undefined,
  }

  // Get student tutor record
  const { data: tutor, error: tutorError } = await supabase
    .from('student_tutors')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (tutorError || !tutor) {
    // No tutor exists yet - return empty history
    return NextResponse.json({
      messages: [],
      hasMore: false,
      total: 0,
    })
  }

  // Build query
  let query = supabase
    .from('tutor_messages')
    .select('id, role, content, course_id, context_files, created_at', {
      count: 'exact',
    })
    .eq('tutor_id', tutor.id)
    .order('created_at', { ascending: true })

  // Filter by course if specified
  if (params.courseId) {
    query = query.eq('course_id', params.courseId)
  }

  // Apply pagination
  query = query.range(
    params.offset!,
    params.offset! + params.limit! - 1
  )

  const { data: messages, error: messagesError, count } = await query

  if (messagesError) {
    console.error('Error fetching messages:', messagesError)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }

  const total = count || 0
  const hasMore = params.offset! + (messages?.length || 0) < total

  return NextResponse.json({
    messages: messages || [],
    hasMore,
    total,
  })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get student tutor record
  const { data: tutor, error: tutorError } = await supabase
    .from('student_tutors')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (tutorError || !tutor) {
    return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
  }

  // Parse request to check if we're clearing specific messages or all
  const searchParams = request.nextUrl.searchParams
  const messageId = searchParams.get('messageId')
  const courseId = searchParams.get('courseId')

  if (messageId) {
    // Delete specific message
    const { error } = await supabase
      .from('tutor_messages')
      .delete()
      .eq('id', messageId)
      .eq('tutor_id', tutor.id)

    if (error) {
      console.error('Error deleting message:', error)
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      )
    }
  } else if (courseId) {
    // Delete all messages for a specific course
    const { error } = await supabase
      .from('tutor_messages')
      .delete()
      .eq('course_id', courseId)
      .eq('tutor_id', tutor.id)

    if (error) {
      console.error('Error clearing course messages:', error)
      return NextResponse.json(
        { error: 'Failed to clear course messages' },
        { status: 500 }
      )
    }
  } else {
    // Delete all messages for this tutor
    const { error } = await supabase
      .from('tutor_messages')
      .delete()
      .eq('tutor_id', tutor.id)

    if (error) {
      console.error('Error clearing all messages:', error)
      return NextResponse.json(
        { error: 'Failed to clear messages' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true })
}
