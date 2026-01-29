import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    announcementId: string
  }>
}

// GET: Get a single announcement
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { announcementId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the announcement with author info
    const { data: announcement, error } = await supabase
      .from('announcements')
      .select(`
        *,
        author:users!announcements_author_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('id', announcementId)
      .single()

    if (error || !announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('role')
      .eq('course_id', announcement.course_id)
      .eq('user_id', user.id)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      )
    }

    const isStaff = enrollment.role === 'teacher' || enrollment.role === 'ta'

    // Students cannot see unpublished announcements
    if (!isStaff && announcement.publish_at && new Date(announcement.publish_at) > new Date()) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if read by current user
    const { data: read } = await supabase
      .from('announcement_reads')
      .select('id')
      .eq('announcement_id', announcementId)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      announcement: {
        ...announcement,
        is_read: !!read,
      },
      isStaff,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update an announcement
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { announcementId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the existing announcement
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('course_id, author_id')
      .eq('id', announcementId)
      .single()

    if (fetchError || !existingAnnouncement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if user is staff
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('role')
      .eq('course_id', existingAnnouncement.course_id)
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
        { error: 'Only teachers and TAs can update announcements' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, pinned, publish_at } = body

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (pinned !== undefined) updateData.pinned = pinned
    if (publish_at !== undefined) updateData.publish_at = publish_at

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', announcementId)
      .select(`
        *,
        author:users!announcements_author_id_fkey(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ announcement })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete an announcement
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { announcementId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the existing announcement
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('course_id, author_id')
      .eq('id', announcementId)
      .single()

    if (fetchError || !existingAnnouncement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if user is staff
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('role')
      .eq('course_id', existingAnnouncement.course_id)
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
        { error: 'Only teachers and TAs can delete announcements' },
        { status: 403 }
      )
    }

    // Delete associated reads first
    await supabase
      .from('announcement_reads')
      .delete()
      .eq('announcement_id', announcementId)

    // Delete the announcement
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
