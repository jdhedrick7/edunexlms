'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { QuizAnswers } from '@/types/quiz'

interface QuizNavigationProps {
  totalQuestions: number
  currentQuestion: number
  answers: QuizAnswers
  onNavigate: (index: number) => void
  className?: string
}

export function QuizNavigation({
  totalQuestions,
  currentQuestion,
  answers,
  onNavigate,
  className,
}: QuizNavigationProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">Questions</h3>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, index) => {
          const isAnswered = answers[index] !== undefined && answers[index] !== null
          const isCurrent = currentQuestion === index

          return (
            <Button
              key={index}
              variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onNavigate(index)}
              className={cn(
                'h-9 w-9 p-0 font-medium',
                !isCurrent && !isAnswered && 'border-dashed'
              )}
            >
              {index + 1}
            </Button>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-dashed bg-background" />
          <span>Not answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-secondary" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-primary" />
          <span>Current</span>
        </div>
      </div>
    </div>
  )
}
