import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, FileQuestion, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Quiz, QuestionResult } from '@/types/quiz'
import type { Json } from '@/types/database'

interface QuizPageProps {
  params: Promise<{
    courseId: string
    quizPath: string
  }>
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { courseId, quizPath } = await params
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

  // Type for quiz attempt with answers
  type QuizAttemptRow = {
    id: string
    attempt_number: number
    score: number | null
    max_score: number | null
    started_at: string | null
    submitted_at: string | null
    answers: Json
    user?: { id: string; full_name: string | null; email: string }
  }

  // Get attempts
  let attempts: QuizAttemptRow[] = []

  if (isStaff) {
    // Get all student attempts
    const { data } = await supabase
      .from('quiz_attempts')
      .select(`
        id, attempt_number, score, max_score, started_at, submitted_at, answers,
        user:users(id, full_name, email)
      `)
      .eq('course_id', courseId)
      .eq('quiz_path', decodedQuizPath)
      .order('submitted_at', { ascending: false })

    attempts = (data || []) as QuizAttemptRow[]
  } else {
    // Get only current user's attempts
    const { data } = await supabase
      .from('quiz_attempts')
      .select('id, attempt_number, score, max_score, started_at, submitted_at, answers')
      .eq('course_id', courseId)
      .eq('quiz_path', decodedQuizPath)
      .eq('user_id', user.id)
      .order('attempt_number', { ascending: true })

    attempts = (data || []) as QuizAttemptRow[]
  }

  const completedAttempts = attempts.filter((a) => a.submitted_at)
  const inProgressAttempt = attempts.find((a) => !a.submitted_at)
  const canStartNewAttempt =
    !isStaff && !inProgressAttempt && completedAttempts.length < quiz.attempts

  // Calculate total points
  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0)

  // Get best score for student
  const bestScore =
    !isStaff && completedAttempts.length > 0
      ? Math.max(...completedAttempts.filter((a) => a.score !== null).map((a) => a.score!))
      : null

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to Course
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{quiz.title}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Time Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{quiz.timeLimit} minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isStaff ? quiz.attempts : `${completedAttempts.length} / ${quiz.attempts}`}
            </p>
            {!isStaff && completedAttempts.length >= quiz.attempts && (
              <p className="text-sm text-muted-foreground">Maximum attempts reached</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {quiz.questions.length} ({totalPoints} pts)
            </p>
          </CardContent>
        </Card>
      </div>

      {!isStaff && bestScore !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Best Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {bestScore} / {totalPoints}
              <span className="ml-2 text-lg text-muted-foreground">
                ({Math.round((bestScore / totalPoints) * 100)}%)
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions for students */}
      {!isStaff && (
        <div className="flex gap-4">
          {inProgressAttempt && (
            <Button asChild size="lg">
              <Link
                href={`/courses/${courseId}/quizzes/${quizPath}/take?attemptId=${inProgressAttempt.id}`}
              >
                Continue Quiz
              </Link>
            </Button>
          )}
          {canStartNewAttempt && (
            <StartQuizButton
              courseId={courseId}
              quizPath={quizPath}
              quiz={quiz}
            />
          )}
        </div>
      )}

      {/* Past attempts */}
      <Card>
        <CardHeader>
          <CardTitle>{isStaff ? 'All Student Attempts' : 'Your Attempts'}</CardTitle>
          <CardDescription>
            {isStaff
              ? 'View all student submissions for this quiz'
              : 'Your quiz history and scores'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {isStaff ? 'No students have attempted this quiz yet.' : 'You have not attempted this quiz yet.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isStaff && <TableHead>Student</TableHead>}
                  <TableHead>Attempt</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => {
                  const answersObj = attempt.answers as { __questionResults?: QuestionResult[] } | null
                  const hasUngradedQuestions = answersObj?.__questionResults?.some(
                    (r: QuestionResult) => r.correct === null
                  )

                  return (
                    <TableRow key={attempt.id}>
                      {isStaff && (
                        <TableCell>
                          {attempt.user?.full_name || attempt.user?.email || 'Unknown'}
                        </TableCell>
                      )}
                      <TableCell>#{attempt.attempt_number}</TableCell>
                      <TableCell>
                        {attempt.started_at
                          ? new Date(attempt.started_at).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {attempt.submitted_at
                          ? new Date(attempt.submitted_at).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {attempt.submitted_at ? (
                          attempt.score !== null ? (
                            `${attempt.score} / ${attempt.max_score}`
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              Pending
                            </span>
                          )
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {!attempt.submitted_at ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <AlertCircle className="h-4 w-4" />
                            In Progress
                          </span>
                        ) : hasUngradedQuestions ? (
                          <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="h-4 w-4" />
                            Needs Grading
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Complete
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {attempt.submitted_at ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/courses/${courseId}/quizzes/${quizPath}/results/${attempt.id}`}
                            >
                              View Results
                            </Link>
                          </Button>
                        ) : !isStaff ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/courses/${courseId}/quizzes/${quizPath}/take?attemptId=${attempt.id}`}
                            >
                              Continue
                            </Link>
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Client component for starting a new quiz
import { StartQuizButtonClient } from './start-quiz-button'

function StartQuizButton({
  courseId,
  quizPath,
  quiz,
}: {
  courseId: string
  quizPath: string
  quiz: Quiz
}) {
  return <StartQuizButtonClient courseId={courseId} quizPath={quizPath} quiz={quiz} />
}
