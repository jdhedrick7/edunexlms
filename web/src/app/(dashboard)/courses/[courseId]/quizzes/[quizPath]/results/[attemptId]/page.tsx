import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { QuizResults } from '@/components/quiz/quiz-results'
import type { Quiz, QuizAnswers, QuestionResult } from '@/types/quiz'

interface ResultsPageProps {
  params: Promise<{
    courseId: string
    quizPath: string
    attemptId: string
  }>
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { courseId, quizPath, attemptId } = await params
  const decodedQuizPath = decodeURIComponent(quizPath)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get enrollment and role
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) {
    redirect('/courses')
  }

  const isStaff = enrollment.role === 'teacher' || enrollment.role === 'ta'

  // Get the attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      user:users(id, full_name, email)
    `)
    .eq('id', attemptId)
    .single()

  if (attemptError || !attempt) {
    notFound()
  }

  // Students can only view their own results
  if (!isStaff && attempt.user_id !== user.id) {
    redirect(`/courses/${courseId}/quizzes/${quizPath}`)
  }

  // Must be submitted to view results
  if (!attempt.submitted_at) {
    if (attempt.user_id === user.id) {
      redirect(`/courses/${courseId}/quizzes/${quizPath}/take?attemptId=${attemptId}`)
    }
    redirect(`/courses/${courseId}/quizzes/${quizPath}`)
  }

  // Get course with published version to fetch quiz
  const { data: course } = await supabase
    .from('courses')
    .select(`
      *,
      institution:institutions(id),
      published_version:course_versions!fk_published_version(id, storage_path)
    `)
    .eq('id', courseId)
    .single()

  if (!course || !course.published_version) {
    notFound()
  }

  // Fetch the quiz JSON from storage
  const bucketName = `inst-${course.institution.id}`
  const quizFilePath = `${course.published_version.storage_path}/${decodedQuizPath}`

  const { data: quizFile, error: quizError } = await supabase.storage
    .from(bucketName)
    .download(quizFilePath)

  if (quizError || !quizFile) {
    notFound()
  }

  const quizText = await quizFile.text()
  const quiz: Quiz = JSON.parse(quizText)

  // For results display, only show answers if quiz allows it or user is staff
  const showAnswers = quiz.showAnswers !== false || isStaff

  // Prepare quiz with or without answers for display
  const displayQuiz: Quiz = {
    ...quiz,
    showAnswers,
  }

  // Extract answers and question results from attempt
  const attemptAnswers = attempt.answers as QuizAnswers & {
    __questionResults?: QuestionResult[]
  }
  const questionResults = attemptAnswers.__questionResults || []

  // Clean answers for display (remove metadata)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { __questionResults, ...cleanAnswers } = attemptAnswers

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/courses/${courseId}/quizzes/${quizPath}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to Quiz
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{quiz.title}</h1>
          {isStaff && attempt.user && (
            <p className="mt-1 text-muted-foreground">
              Student: {attempt.user.full_name || attempt.user.email}
            </p>
          )}
          <p className="mt-1 text-muted-foreground">
            Attempt #{attempt.attempt_number}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/courses/${courseId}/quizzes/${quizPath}`}>View All Attempts</Link>
        </Button>
      </div>

      <QuizResults
        quiz={displayQuiz}
        answers={cleanAnswers}
        score={attempt.score}
        maxScore={attempt.max_score || quiz.questions.reduce((sum, q) => sum + q.points, 0)}
        questionResults={questionResults}
        submittedAt={attempt.submitted_at}
      />
    </div>
  )
}
