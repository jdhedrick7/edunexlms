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

  // Get current students
  const { data: students, error } = await supabase
    .from('enrollments')
    .select('id, user:users(id, full_name, email)')
    .eq('course_id', courseId)
    .eq('role', 'student')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ students: students?.map(s => s.user) || [] })
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
  const { studentId } = body

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  // Verify the student is a member of the institution
  const { data: studentMembership } = await supabase
    .from('institution_members')
    .select('id')
    .eq('user_id', studentId)
    .eq('institution_id', membership.institution_id)
    .single()

  if (!studentMembership) {
    return NextResponse.json({ error: 'User is not a member of this institution' }, { status: 400 })
  }

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id, role')
    .eq('course_id', courseId)
    .eq('user_id', studentId)
    .single()

  if (existingEnrollment) {
    if (existingEnrollment.role === 'student') {
      return NextResponse.json({ error: 'User is already enrolled as a student' }, { status: 409 })
    }
    // User has another role, don't change it
    return NextResponse.json({ error: 'User is already enrolled with a different role' }, { status: 409 })
  }

  // Create new enrollment
  const { error: insertError } = await supabase
    .from('enrollments')
    .insert({
      course_id: courseId,
      user_id: studentId,
      role: 'student',
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
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
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  // Remove student enrollment
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('course_id', courseId)
    .eq('user_id', studentId)
    .eq('role', 'student')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
