'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QuizTimer } from '@/components/quiz/quiz-timer'
import { QuizQuestionComponent } from '@/components/quiz/quiz-question'
import { QuizNavigation } from '@/components/quiz/quiz-navigation'
import { ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'
import type { Quiz, QuizAnswers } from '@/types/quiz'

interface TakeQuizClientProps {
  courseId: string
  quizPath: string
  attemptId: string
  quiz: Quiz
  initialAnswers: QuizAnswers
  startedAt: string
}

export function TakeQuizClient({
  courseId,
  quizPath,
  attemptId,
  quiz,
  initialAnswers,
  startedAt,
}: TakeQuizClientProps) {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswers>(initialAnswers || {})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastSavedAnswers = useRef<string>(JSON.stringify(initialAnswers || {}))
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save answers with debounce
  const saveAnswers = useCallback(
    async (answersToSave: QuizAnswers) => {
      const currentAnswersJson = JSON.stringify(answersToSave)
      if (currentAnswersJson === lastSavedAnswers.current) {
        return // No changes to save
      }

      try {
        const response = await fetch(
          `/api/quizzes/${encodeURIComponent(quizPath)}/attempts/${attemptId}?courseId=${courseId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, answers: answersToSave }),
          }
        )

        if (response.ok) {
          lastSavedAnswers.current = currentAnswersJson
        }
      } catch {
        // Silently fail auto-save, will retry on next change
      }
    },
    [courseId, quizPath, attemptId]
  )

  // Debounced save effect
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveAnswers(answers)
    }, 1000) // Save after 1 second of no changes

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [answers, saveAnswers])

  // Warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Handle time up
  const handleTimeUp = useCallback(() => {
    setShowTimeUpDialog(true)
  }, [])

  // Submit quiz
  async function handleSubmit() {
    setIsSubmitting(true)
    setError(null)

    try {
      // Save any pending answers first
      await saveAnswers(answers)

      const response = await fetch(
        `/api/quizzes/${encodeURIComponent(quizPath)}/attempts/${attemptId}?courseId=${courseId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, quiz, answers }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quiz')
      }

      // Redirect to results
      router.push(`/courses/${courseId}/quizzes/${quizPath}/results/${attemptId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
      setIsSubmitting(false)
      setShowSubmitDialog(false)
      setShowTimeUpDialog(false)
    }
  }

  // Handle answer change
  function handleAnswerChange(value: string | number | null) {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion]: value,
    }))
  }

  // Navigation
  function goToQuestion(index: number) {
    if (index >= 0 && index < quiz.questions.length) {
      setCurrentQuestion(index)
    }
  }

  const currentQuestionData = quiz.questions[currentQuestion]
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[parseInt(k)] !== null && answers[parseInt(k)] !== undefined
  ).length
  const unansweredCount = quiz.questions.length - answeredCount

  return (
    <div className="min-h-screen">
      {/* Top bar with timer */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between py-3">
          <div>
            <h1 className="text-lg font-semibold">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </p>
          </div>
          <QuizTimer
            startedAt={startedAt}
            timeLimitMinutes={quiz.timeLimit}
            onTimeUp={handleTimeUp}
          />
        </div>
      </div>

      <div className="container py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main content */}
          <div className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Card>
              <CardContent className="pt-6">
                <QuizQuestionComponent
                  question={currentQuestionData}
                  questionNumber={currentQuestion + 1}
                  value={answers[currentQuestion]}
                  onChange={handleAnswerChange}
                />
              </CardContent>
            </Card>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => goToQuestion(currentQuestion - 1)}
                disabled={currentQuestion === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              <div className="flex gap-2">
                {currentQuestion === quiz.questions.length - 1 ? (
                  <Button onClick={() => setShowSubmitDialog(true)}>
                    <Send className="mr-1 h-4 w-4" />
                    Submit Quiz
                  </Button>
                ) : (
                  <Button onClick={() => goToQuestion(currentQuestion + 1)}>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <QuizNavigation
              totalQuestions={quiz.questions.length}
              currentQuestion={currentQuestion}
              answers={answers}
              onNavigate={goToQuestion}
            />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Answered</span>
                    <span className="font-medium">{answeredCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Unanswered</span>
                    <span className="font-medium text-muted-foreground">{unansweredCount}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(answeredCount / quiz.questions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={() => setShowSubmitDialog(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit Quiz
            </Button>
          </div>
        </div>
      </div>

      {/* Submit confirmation dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your quiz?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {unansweredCount > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/30">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">
                    {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    You can still submit, but unanswered questions will receive 0 points.
                  </p>
                </div>
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Once submitted, you cannot change your answers.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time up dialog */}
      <Dialog open={showTimeUpDialog} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Time is Up!</DialogTitle>
            <DialogDescription>
              Your time has expired. Your quiz will be submitted automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {answeredCount} of {quiz.questions.length} questions answered.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
