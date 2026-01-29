import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    announcementId: string
  }>
}

// POST: Mark an announcement as read
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { announcementId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the announcement to check course enrollment
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('course_id, publish_at')
      .eq('id', announcementId)
      .single()

    if (announcementError || !announcement) {
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

    // Check if announcement is published (for students)
    const isStaff = enrollment.role === 'teacher' || enrollment.role === 'ta'
    if (!isStaff && announcement.publish_at && new Date(announcement.publish_at) > new Date()) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if already read
    const { data: existingRead } = await supabase
      .from('announcement_reads')
      .select('id')
      .eq('announcement_id', announcementId)
      .eq('user_id', user.id)
      .single()

    if (existingRead) {
      return NextResponse.json({ success: true, message: 'Already marked as read' })
    }

    // Create read record
    const { error } = await supabase
      .from('announcement_reads')
      .insert({
        announcement_id: announcementId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      })

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
