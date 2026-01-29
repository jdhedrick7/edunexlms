import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  const userId = searchParams.get('userId')
  const assignmentPath = searchParams.get('assignmentPath')

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Check if user is enrolled in the course
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
  }

  // Build query
  let query = supabase
    .from('submissions')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url),
      grade:grades(*)
    `)
    .eq('course_id', courseId)

  // Students can only see their own submissions
  if (enrollment.role === 'student') {
    query = query.eq('user_id', user.id)
  } else if (userId) {
    // Teachers/TAs can filter by user
    query = query.eq('user_id', userId)
  }

  if (assignmentPath) {
    query = query.eq('assignment_path', assignmentPath)
  }

  query = query.order('submitted_at', { ascending: false })

  const { data: submissions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(submissions)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { courseId, assignmentPath, textContent, files, status = 'submitted' } = body

  if (!courseId || !assignmentPath) {
    return NextResponse.json(
      { error: 'courseId and assignmentPath are required' },
      { status: 400 }
    )
  }

  // Check if user is enrolled as a student
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
  }

  if (enrollment.role !== 'student') {
    return NextResponse.json(
      { error: 'Only students can submit assignments' },
      { status: 403 }
    )
  }

  // Create storage path for the submission
  const storagePath = `courses/${courseId}/submissions/${user.id}/${assignmentPath.replace(/\//g, '_')}`

  // Check if submission already exists
  const { data: existingSubmission } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .eq('assignment_path', assignmentPath)
    .single()

  if (existingSubmission) {
    // Don't allow resubmission if already graded
    if (existingSubmission.status === 'graded') {
      return NextResponse.json(
        { error: 'Cannot modify a graded submission' },
        { status: 400 }
      )
    }

    // Update existing submission
    const { data: submission, error } = await supabase
      .from('submissions')
      .update({
        text_content: textContent,
        files: files || [],
        status,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existingSubmission.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(submission)
  }

  // Create new submission
  const { data: submission, error } = await supabase
    .from('submissions')
    .insert({
      course_id: courseId,
      user_id: user.id,
      assignment_path: assignmentPath,
      storage_path: storagePath,
      text_content: textContent,
      files: files || [],
      status,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(submission, { status: 201 })
}
