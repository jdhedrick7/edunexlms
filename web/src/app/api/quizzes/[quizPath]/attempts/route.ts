import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Quiz } from '@/types/quiz'
import type { Json } from '@/types/database'

// GET: Get user's attempts for this quiz
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizPath: string }> }
) {
  const { quizPath } = await params
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')

  if (!courseId) {
    return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
  }

  // Decode the quiz path
  const decodedPath = decodeURIComponent(quizPath)

  // If teacher/TA, get all attempts for all students
  if (enrollment.role === 'teacher' || enrollment.role === 'ta') {
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .eq('course_id', courseId)
      .eq('quiz_path', decodedPath)
      .order('submitted_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ attempts, isStaff: true })
  }

  // If student, get only their attempts
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('course_id', courseId)
    .eq('quiz_path', decodedPath)
    .eq('user_id', user.id)
    .order('attempt_number', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ attempts, isStaff: false })
}

// POST: Start a new quiz attempt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizPath: string }> }
) {
  const { quizPath } = await params
  const body = await request.json()
  const { courseId, quiz } = body as { courseId: string; quiz: Quiz }

  if (!courseId || !quiz) {
    return NextResponse.json(
      { error: 'Course ID and quiz data are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check enrollment (students only)
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role !== 'student') {
    return NextResponse.json(
      { error: 'Only students can take quizzes' },
      { status: 403 }
    )
  }

  // Decode the quiz path
  const decodedPath = decodeURIComponent(quizPath)

  // Check existing attempts
  const { data: existingAttempts } = await supabase
    .from('quiz_attempts')
    .select('id, submitted_at, attempt_number')
    .eq('course_id', courseId)
    .eq('quiz_path', decodedPath)
    .eq('user_id', user.id)
    .order('attempt_number', { ascending: false })

  // Check for in-progress attempt
  const inProgressAttempt = existingAttempts?.find((a) => !a.submitted_at)
  if (inProgressAttempt) {
    return NextResponse.json(
      { error: 'You already have an in-progress attempt', attemptId: inProgressAttempt.id },
      { status: 400 }
    )
  }

  // Check max attempts
  const completedAttempts = existingAttempts?.filter((a) => a.submitted_at) || []
  if (completedAttempts.length >= quiz.attempts) {
    return NextResponse.json(
      { error: `Maximum attempts (${quiz.attempts}) reached` },
      { status: 400 }
    )
  }

  // Calculate max score
  const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0)

  // Create new attempt
  const newAttemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1
  const emptyAnswers: Json = {}

  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .insert({
      course_id: courseId,
      user_id: user.id,
      quiz_path: decodedPath,
      attempt_number: newAttemptNumber,
      answers: emptyAnswers,
      max_score: maxScore,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ attempt })
}
