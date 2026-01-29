import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List announcements for a course
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!courseId) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      )
    }

    // Check enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('role')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      )
    }

    const isStaff = enrollment.role === 'teacher' || enrollment.role === 'ta'

    // Build query
    let query = supabase
      .from('announcements')
      .select(`
        *,
        author:users!announcements_author_id_fkey(id, full_name, email, avatar_url)
      `, { count: 'exact' })
      .eq('course_id', courseId)
      .order('pinned', { ascending: false })
      .order('publish_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Students only see published announcements
    if (!isStaff) {
      query = query.lte('publish_at', new Date().toISOString())
    }

    const { data: announcements, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get read status for the current user
    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id)
      .in(
        'announcement_id',
        announcements?.map((a) => a.id) || []
      )

    const readIds = new Set(reads?.map((r) => r.announcement_id) || [])

    // Add read status to announcements
    const announcementsWithReadStatus = announcements?.map((announcement) => ({
      ...announcement,
      is_read: readIds.has(announcement.id),
    }))

    return NextResponse.json({
      announcements: announcementsWithReadStatus,
      total: count,
      limit,
      offset,
      isStaff,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new announcement
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { course_id, title, content, pinned, publish_at } = body

    if (!course_id || !title || !content) {
      return NextResponse.json(
        { error: 'course_id, title, and content are required' },
        { status: 400 }
      )
    }

    // Check if user is staff (teacher or TA)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('role')
      .eq('course_id', course_id)
      .eq('user_id', user.id)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      )
    }

    if (enrollment.role !== 'teacher' && enrollment.role !== 'ta') {
      return NextResponse.json(
        { error: 'Only teachers and TAs can create announcements' },
        { status: 403 }
      )
    }

    // Create announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        course_id,
        author_id: user.id,
        title,
        content,
        pinned: pinned || false,
        publish_at: publish_at || new Date().toISOString(),
      })
      .select(`
        *,
        author:users!announcements_author_id_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
