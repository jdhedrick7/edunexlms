import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Quiz, QuizAnswers } from '@/types/quiz'
import type { Json } from '@/types/database'

// Result type for graded questions
interface QuestionResultJson {
  questionIndex: number
  correct: boolean | null
  pointsEarned: number | null
  pointsPossible: number
  studentAnswer: string | number | null
  correctAnswer?: number
}

// GET: Get attempt details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizPath: string; attemptId: string }> }
) {
  const { attemptId } = await params
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

  // Get the attempt
  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .single()

  if (error || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  // Students can only see their own attempts
  if (enrollment.role === 'student' && attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  return NextResponse.json({ attempt })
}

// PATCH: Update answers (auto-save)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quizPath: string; attemptId: string }> }
) {
  const { attemptId } = await params
  const body = await request.json()
  const { courseId, answers } = body as { courseId: string; answers: QuizAnswers }

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

  // Get the attempt
  const { data: attempt, error: fetchError } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .single()

  if (fetchError || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  // Only the owner can update their attempt
  if (attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Cannot update submitted attempt
  if (attempt.submitted_at) {
    return NextResponse.json({ error: 'Cannot update submitted attempt' }, { status: 400 })
  }

  // Update the answers
  const { data: updatedAttempt, error: updateError } = await supabase
    .from('quiz_attempts')
    .update({ answers: answers as unknown as Json })
    .eq('id', attemptId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ attempt: updatedAttempt })
}

// POST: Submit attempt (grade it)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizPath: string; attemptId: string }> }
) {
  const { attemptId } = await params
  const body = await request.json()
  const { courseId, quiz, answers } = body as {
    courseId: string
    quiz: Quiz
    answers: QuizAnswers
  }

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

  // Get the attempt
  const { data: attempt, error: fetchError } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .single()

  if (fetchError || !attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  }

  // Only the owner can submit their attempt
  if (attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Cannot submit already submitted attempt
  if (attempt.submitted_at) {
    return NextResponse.json({ error: 'Attempt already submitted' }, { status: 400 })
  }

  // Grade the quiz
  const questionResults: QuestionResultJson[] = []
  let totalScore = 0
  let hasUngradedQuestions = false

  quiz.questions.forEach((question, index) => {
    const studentAnswer = answers[index]
    const result: QuestionResultJson = {
      questionIndex: index,
      correct: null,
      pointsEarned: null,
      pointsPossible: question.points,
      studentAnswer,
    }

    if (question.type === 'multiple_choice') {
      const isCorrect = studentAnswer === question.correctIndex
      result.correct = isCorrect
      result.pointsEarned = isCorrect ? question.points : 0
      result.correctAnswer = question.correctIndex
      totalScore += result.pointsEarned
    } else if (question.type === 'short_answer') {
      // Short answer needs manual grading
      result.correct = null
      result.pointsEarned = null
      hasUngradedQuestions = true
    }

    questionResults.push(result)
  })

  // Calculate max score
  const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0)

  // Update the attempt with answers, score, and submit timestamp
  // Store question results in answers JSONB as metadata
  const updatedAnswers = {
    ...answers,
    __questionResults: questionResults,
  } as unknown as Json

  const { data: updatedAttempt, error: updateError } = await supabase
    .from('quiz_attempts')
    .update({
      answers: updatedAnswers,
      score: hasUngradedQuestions ? null : totalScore,
      max_score: maxScore,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    attempt: updatedAttempt,
    questionResults,
    hasUngradedQuestions,
  })
}
