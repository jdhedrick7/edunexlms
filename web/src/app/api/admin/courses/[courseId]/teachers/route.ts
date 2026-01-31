import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin access
  const { data: membership } = await supabase
    .from('institution_members')
    .select('institution_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify course belongs to admin's institution
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('institution_id', membership.institution_id)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Get current teachers
  const { data: teachers, error } = await supabase
    .from('enrollments')
    .select('id, user:users(id, full_name, email)')
    .eq('course_id', courseId)
    .eq('role', 'teacher')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ teachers: teachers?.map(t => t.user) || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin access
  const { data: membership } = await supabase
    .from('institution_members')
    .select('institution_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify course belongs to admin's institution
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('institution_id', membership.institution_id)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const body = await request.json()
  const { teacherId } = body

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
  }

  // Verify the teacher is a member of the institution
  const { data: teacherMembership } = await supabase
    .from('institution_members')
    .select('id')
    .eq('user_id', teacherId)
    .eq('institution_id', membership.institution_id)
    .single()

  if (!teacherMembership) {
    return NextResponse.json({ error: 'User is not a member of this institution' }, { status: 400 })
  }

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', teacherId)
    .single()

  if (existingEnrollment) {
    // Update role to teacher if already enrolled
    const { error: updateError } = await supabase
      .from('enrollments')
      .update({ role: 'teacher' })
      .eq('id', existingEnrollment.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  } else {
    // Create new enrollment
    const { error: insertError } = await supabase
      .from('enrollments')
      .insert({
        course_id: courseId,
        user_id: teacherId,
        role: 'teacher',
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin access
  const { data: membership } = await supabase
    .from('institution_members')
    .select('institution_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify course belongs to admin's institution
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('institution_id', membership.institution_id)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacherId')

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
  }

  // Remove teacher enrollment
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('course_id', courseId)
    .eq('user_id', teacherId)
    .eq('role', 'teacher')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
