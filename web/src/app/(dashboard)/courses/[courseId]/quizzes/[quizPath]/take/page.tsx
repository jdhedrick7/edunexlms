import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TakeQuizClient } from './take-quiz-client'
import type { Quiz, QuizAnswers } from '@/types/quiz'

interface TakeQuizPageProps {
  params: Promise<{
    courseId: string
    quizPath: string
  }>
  searchParams: Promise<{
    attemptId?: string
  }>
}

export default async function TakeQuizPage({ params, searchParams }: TakeQuizPageProps) {
  const { courseId, quizPath } = await params
  const { attemptId } = await searchParams
  const decodedQuizPath = decodeURIComponent(quizPath)

  if (!attemptId) {
    redirect(`/courses/${courseId}/quizzes/${quizPath}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .single()

  if (attemptError || !attempt) {
    notFound()
  }

  // Verify this is the user's attempt
  if (attempt.user_id !== user.id) {
    redirect(`/courses/${courseId}/quizzes/${quizPath}`)
  }

  // If already submitted, redirect to results
  if (attempt.submitted_at) {
    redirect(`/courses/${courseId}/quizzes/${quizPath}/results/${attemptId}`)
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

  // Remove correct answers from quiz data sent to client
  const clientQuiz: Quiz = {
    ...quiz,
    questions: quiz.questions.map((q) => {
      if (q.type === 'multiple_choice') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { correctIndex, ...rest } = q
        return rest as typeof q
      }
      return q
    }),
  }

  return (
    <TakeQuizClient
      courseId={courseId}
      quizPath={quizPath}
      attemptId={attemptId}
      quiz={clientQuiz}
      initialAnswers={attempt.answers as QuizAnswers}
      startedAt={attempt.started_at!}
    />
  )
}
