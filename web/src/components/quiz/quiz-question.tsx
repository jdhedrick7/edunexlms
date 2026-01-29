'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { QuizQuestion } from '@/types/quiz'

interface QuizQuestionComponentProps {
  question: QuizQuestion
  questionNumber: number
  value: string | number | null
  onChange: (value: string | number | null) => void
  disabled?: boolean
  showResult?: {
    correct: boolean | null
    correctAnswer?: number
    pointsEarned: number | null
  }
}

export function QuizQuestionComponent({
  question,
  questionNumber,
  value,
  onChange,
  disabled = false,
  showResult,
}: QuizQuestionComponentProps) {
  const id = useId()

  return (
    <div
      className={cn(
        'rounded-lg border p-6',
        showResult?.correct === true && 'border-green-500 bg-green-50 dark:bg-green-950/20',
        showResult?.correct === false && 'border-red-500 bg-red-50 dark:bg-red-950/20',
        showResult?.correct === null && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
        !showResult && 'border-border'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <span className="text-sm font-medium text-muted-foreground">
            Question {questionNumber}
          </span>
          <p className="mt-1 text-lg font-medium">{question.question}</p>
        </div>
        <div className="text-right">
          <span className="text-sm text-muted-foreground">
            {showResult?.pointsEarned !== null && showResult?.pointsEarned !== undefined
              ? `${showResult.pointsEarned} / ${question.points} pts`
              : `${question.points} pts`}
          </span>
          {showResult && (
            <div className="mt-1">
              {showResult.correct === true && (
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Correct</span>
              )}
              {showResult.correct === false && (
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Incorrect</span>
              )}
              {showResult.correct === null && (
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Pending</span>
              )}
            </div>
          )}
        </div>
      </div>

      {question.type === 'multiple_choice' && question.options && (
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = value === index
            const isCorrectAnswer = showResult?.correctAnswer === index
            const isIncorrectSelection = showResult && isSelected && showResult.correct === false

            return (
              <label
                key={index}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                  !disabled && !showResult && 'hover:bg-muted',
                  isSelected && !showResult && 'border-primary bg-primary/5',
                  showResult && isCorrectAnswer && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                  showResult && isIncorrectSelection && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                  disabled && 'cursor-not-allowed opacity-70'
                )}
              >
                <input
                  type="radio"
                  name={`question-${id}`}
                  value={index}
                  checked={isSelected}
                  onChange={() => onChange(index)}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <span className={cn(
                  showResult && isCorrectAnswer && 'font-medium text-green-700 dark:text-green-400',
                  showResult && isIncorrectSelection && 'text-red-700 dark:text-red-400'
                )}>
                  {option}
                </span>
                {showResult && isCorrectAnswer && (
                  <span className="ml-auto text-sm text-green-600 dark:text-green-400">(Correct Answer)</span>
                )}
              </label>
            )
          })}
        </div>
      )}

      {question.type === 'short_answer' && (
        <div className="space-y-2">
          <Label htmlFor={`answer-${id}`} className="sr-only">
            Your answer
          </Label>
          <Input
            id={`answer-${id}`}
            type="text"
            placeholder="Type your answer here..."
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className="w-full"
          />
          {showResult && value && (
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">Your answer: </span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          )}
          {showResult?.correct === null && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              This answer requires manual grading by the instructor.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
