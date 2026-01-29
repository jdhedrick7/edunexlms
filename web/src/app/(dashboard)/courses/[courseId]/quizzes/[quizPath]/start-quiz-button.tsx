'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Quiz } from '@/types/quiz'

interface StartQuizButtonClientProps {
  courseId: string
  quizPath: string
  quiz: Quiz
}

export function StartQuizButtonClient({ courseId, quizPath, quiz }: StartQuizButtonClientProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStartQuiz() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/quizzes/${encodeURIComponent(quizPath)}/attempts?courseId=${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, quiz }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.attemptId) {
          // There's an in-progress attempt, redirect to it
          router.push(`/courses/${courseId}/quizzes/${quizPath}/take?attemptId=${data.attemptId}`)
          return
        }
        throw new Error(data.error || 'Failed to start quiz')
      }

      // Redirect to take quiz page
      router.push(`/courses/${courseId}/quizzes/${quizPath}/take?attemptId=${data.attempt.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quiz')
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg">Start Quiz</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ready to start?</DialogTitle>
          <DialogDescription>
            Before you begin, please review the following:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <ul className="list-disc pl-4 space-y-2 text-sm">
            <li>
              <strong>Time limit:</strong> {quiz.timeLimit} minutes. The quiz will automatically
              submit when time runs out.
            </li>
            <li>
              <strong>Questions:</strong> {quiz.questions.length} questions worth{' '}
              {quiz.questions.reduce((sum, q) => sum + q.points, 0)} points total.
            </li>
            <li>
              <strong>Auto-save:</strong> Your answers are saved automatically as you go.
            </li>
            <li>
              <strong>No going back:</strong> Once you submit, you cannot retake this attempt.
            </li>
          </ul>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleStartQuiz} disabled={isLoading}>
            {isLoading ? 'Starting...' : 'Start Quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
