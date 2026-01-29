import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Verify user is a teacher or TA
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['teacher', 'ta'])

    const { data: memberships } = await supabase
      .from('institution_members')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['teacher', 'ta', 'admin'])

    const isTeacherOrTA = (enrollments && enrollments.length > 0) ||
                          (memberships && memberships.length > 0)

    if (!isTeacherOrTA) {
      return Response.json({ error: 'Forbidden - Teachers and TAs only' }, { status: 403 })
    }

    // Get assistant record
    const { data: assistant } = await supabase
      .from('teacher_assistants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return Response.json({ messages: [], total: 0 })
    }

    // Build query
    let query = supabase
      .from('teacher_messages')
      .select('*', { count: 'exact' })
      .eq('assistant_id', assistant.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    // Filter by course if provided
    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: messages, count, error } = await query

    if (error) {
      console.error('Failed to fetch messages:', error)
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return Response.json({
      messages: messages || [],
      total: count || 0,
      offset,
      limit
    })

  } catch (error) {
    console.error('History API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
