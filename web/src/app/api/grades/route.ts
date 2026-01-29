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
    .from('grades')
    .select(`
      *,
      submission:submissions(*),
      grader:users!grades_graded_by_fkey(id, full_name, email)
    `)
    .eq('course_id', courseId)

  // Students can only see their own grades
  if (enrollment.role === 'student') {
    query = query.eq('user_id', user.id)
  } else if (userId) {
    // Teachers/TAs can filter by user
    query = query.eq('user_id', userId)
  }

  query = query.order('graded_at', { ascending: false })

  const { data: grades, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(grades)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    submissionId,
    courseId,
    studentId,
    assignmentPath,
    pointsEarned,
    pointsPossible,
    feedback,
    rubricScores,
  } = body

  if (!courseId || !studentId || !assignmentPath || pointsPossible === undefined) {
    return NextResponse.json(
      { error: 'courseId, studentId, assignmentPath, and pointsPossible are required' },
      { status: 400 }
    )
  }

  // Check if user is a teacher or TA for this course
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role === 'student') {
    return NextResponse.json(
      { error: 'Only teachers and TAs can grade submissions' },
      { status: 403 }
    )
  }

  // Check if grade already exists
  const { data: existingGrade } = await supabase
    .from('grades')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', studentId)
    .eq('assignment_path', assignmentPath)
    .single()

  const gradeData = {
    submission_id: submissionId || null,
    course_id: courseId,
    user_id: studentId,
    assignment_path: assignmentPath,
    points_earned: pointsEarned,
    points_possible: pointsPossible,
    graded_by: user.id,
    feedback: feedback || null,
    rubric_scores: rubricScores || null,
    graded_at: new Date().toISOString(),
  }

  let grade
  let error

  if (existingGrade) {
    // Update existing grade
    const result = await supabase
      .from('grades')
      .update(gradeData)
      .eq('id', existingGrade.id)
      .select()
      .single()

    grade = result.data
    error = result.error
  } else {
    // Create new grade
    const result = await supabase
      .from('grades')
      .insert(gradeData)
      .select()
      .single()

    grade = result.data
    error = result.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update submission status to graded if there's a submission
  if (submissionId) {
    await supabase
      .from('submissions')
      .update({ status: 'graded' })
      .eq('id', submissionId)
  }

  return NextResponse.json(grade, { status: existingGrade ? 200 : 201 })
}
