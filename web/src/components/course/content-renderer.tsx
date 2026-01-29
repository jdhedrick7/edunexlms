'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ClipboardList,
  Clock,
  Calendar,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  FileText,
} from 'lucide-react'

// Types for course content
export interface AssignmentContent {
  type: 'assignment'
  title: string
  instructions: string
  points: number
  dueDate?: string | null
  submissionTypes?: string[]
  rubric?: Array<{
    criteria: string
    points: number
    description?: string
  }>
}

export interface QuizQuestion {
  type: 'multiple_choice' | 'short_answer' | 'true_false'
  question: string
  options?: string[]
  correctIndex?: number
  correctAnswer?: boolean
  points: number
}

export interface QuizContent {
  type: 'quiz'
  title: string
  description?: string
  timeLimit?: number
  attempts?: number
  questions: QuizQuestion[]
}

interface ContentRendererProps {
  content: string | AssignmentContent | QuizContent
  contentType: 'markdown' | 'assignment' | 'quiz'
  courseId: string
  modulePath: string
  isStaff?: boolean
  submission?: {
    status: string
    submitted_at?: string
  } | null
  quizAttempts?: number
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold tracking-tight mt-8 mb-4">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-6 mb-3">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="leading-7 [&:not(:first-child)]:mt-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-4 ml-6 list-disc [&>li]:mt-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal [&>li]:mt-2">{children}</ol>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className
            return isInline ? (
              <code
                className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={cn('relative rounded bg-muted p-4 font-mono text-sm block overflow-x-auto', className)}
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-4 border-l-4 border-primary pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 w-full overflow-y-auto">
              <table className="w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-4 hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt || ''}
              className="rounded-lg border my-4"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function AssignmentRenderer({
  assignment,
  submission,
  onStartSubmission,
}: {
  assignment: AssignmentContent
  submission?: { status: string; submitted_at?: string } | null
  onStartSubmission?: () => void
}) {
  const totalPoints = assignment.rubric
    ? assignment.rubric.reduce((sum, r) => sum + r.points, 0)
    : assignment.points

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date()
  const isSubmitted = submission?.status === 'submitted' || submission?.status === 'graded'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
            <ClipboardList className="size-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            <p className="text-muted-foreground">Assignment</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{totalPoints}</div>
          <div className="text-sm text-muted-foreground">points</div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assignment.dueDate && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className={cn('size-5', isPastDue ? 'text-red-500' : 'text-muted-foreground')} />
              <div>
                <p className="text-sm font-medium">Due Date</p>
                <p className={cn('text-sm', isPastDue ? 'text-red-500' : 'text-muted-foreground')}>
                  {new Date(assignment.dueDate).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {submission && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className={cn(
                'size-5',
                isSubmitted ? 'text-green-500' : 'text-yellow-500'
              )} />
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {submission.status}
                  {submission.submitted_at && ` - ${new Date(submission.submitted_at).toLocaleString()}`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {assignment.submissionTypes && assignment.submissionTypes.length > 0 && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Submission Types</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {assignment.submissionTypes.join(', ')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownContent content={assignment.instructions} />
        </CardContent>
      </Card>

      {/* Rubric */}
      {assignment.rubric && assignment.rubric.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rubric</CardTitle>
            <CardDescription>
              Total: {totalPoints} points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignment.rubric.map((criterion, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{criterion.criteria}</p>
                    {criterion.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{criterion.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-semibold">{criterion.points}</span>
                    <span className="text-sm text-muted-foreground"> pts</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit button */}
      {!isSubmitted && onStartSubmission && (
        <div className="flex justify-end">
          <Button onClick={onStartSubmission} size="lg" disabled={!!isPastDue}>
            {isPastDue ? 'Past Due' : 'Start Submission'}
          </Button>
        </div>
      )}
    </div>
  )
}

function QuizRenderer({
  quiz,
  attemptsUsed = 0,
  onStartQuiz,
  isStaff = false,
}: {
  quiz: QuizContent
  attemptsUsed?: number
  onStartQuiz?: () => void
  isStaff?: boolean
}) {
  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0)
  const attemptsRemaining = quiz.attempts ? quiz.attempts - attemptsUsed : null
  const canAttempt = attemptsRemaining === null || attemptsRemaining > 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
            <HelpCircle className="size-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-muted-foreground">Quiz</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{totalPoints}</div>
          <div className="text-sm text-muted-foreground">points</div>
        </div>
      </div>

      {/* Quiz info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <HelpCircle className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Questions</p>
              <p className="text-sm text-muted-foreground">{quiz.questions.length}</p>
            </div>
          </CardContent>
        </Card>
        {quiz.timeLimit && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Time Limit</p>
                <p className="text-sm text-muted-foreground">{quiz.timeLimit} minutes</p>
              </div>
            </CardContent>
          </Card>
        )}
        {quiz.attempts && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className={cn(
                'size-5',
                canAttempt ? 'text-muted-foreground' : 'text-red-500'
              )} />
              <div>
                <p className="text-sm font-medium">Attempts</p>
                <p className={cn('text-sm', canAttempt ? 'text-muted-foreground' : 'text-red-500')}>
                  {attemptsUsed} / {quiz.attempts} used
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {quiz.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownContent content={quiz.description} />
          </CardContent>
        </Card>
      )}

      {/* Staff preview of questions */}
      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Questions Preview</CardTitle>
            <CardDescription>Only visible to course staff</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quiz.questions.map((question, idx) => (
                <div key={idx} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Question {idx + 1} ({question.type.replace('_', ' ')})
                      </p>
                      <p className="mt-1 font-medium">{question.question}</p>
                      {question.type === 'multiple_choice' && question.options && (
                        <ul className="mt-2 space-y-1">
                          {question.options.map((opt, optIdx) => (
                            <li
                              key={optIdx}
                              className={cn(
                                'text-sm',
                                optIdx === question.correctIndex && 'font-semibold text-green-600'
                              )}
                            >
                              {optIdx === question.correctIndex ? '* ' : '  '}{opt}
                            </li>
                          ))}
                        </ul>
                      )}
                      {question.type === 'true_false' && (
                        <p className="mt-2 text-sm text-green-600">
                          Answer: {question.correctAnswer ? 'True' : 'False'}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-semibold">{question.points}</span>
                      <span className="text-sm text-muted-foreground"> pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start quiz button */}
      {!isStaff && onStartQuiz && (
        <div className="flex justify-end">
          <Button onClick={onStartQuiz} size="lg" disabled={!canAttempt}>
            {canAttempt ? 'Start Quiz' : 'No Attempts Remaining'}
          </Button>
        </div>
      )}
    </div>
  )
}

export function ContentRenderer({
  content,
  contentType,
  isStaff = false,
  submission,
  quizAttempts = 0,
}: ContentRendererProps) {
  if (contentType === 'markdown') {
    return <MarkdownContent content={content as string} />
  }

  if (contentType === 'assignment') {
    return (
      <AssignmentRenderer
        assignment={content as AssignmentContent}
        submission={submission}
        // Note: onStartSubmission would be implemented when submissions feature is complete
      />
    )
  }

  if (contentType === 'quiz') {
    return (
      <QuizRenderer
        quiz={content as QuizContent}
        attemptsUsed={quizAttempts}
        isStaff={isStaff}
        // Note: onStartQuiz would be implemented when quiz-taking feature is complete
      />
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="size-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          Unknown content type
        </p>
      </CardContent>
    </Card>
  )
}
