'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QuizQuestionComponent } from './quiz-question'
import type { Quiz, QuestionResult, QuizAnswers } from '@/types/quiz'

interface QuizResultsProps {
  quiz: Quiz
  answers: QuizAnswers
  score: number | null
  maxScore: number
  questionResults: QuestionResult[]
  submittedAt: string
}

export function QuizResults({
  quiz,
  answers,
  score,
  maxScore,
  questionResults,
  submittedAt,
}: QuizResultsProps) {
  const scorePercentage = score !== null ? Math.round((score / maxScore) * 100) : null
  const hasPendingGrading = questionResults.some((r) => r.correct === null)
  const correctCount = questionResults.filter((r) => r.correct === true).length
  const incorrectCount = questionResults.filter((r) => r.correct === false).length
  const pendingCount = questionResults.filter((r) => r.correct === null).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
          <CardDescription>
            Submitted on {new Date(submittedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-3xl font-bold">
                {score !== null ? score : '?'} / {maxScore}
              </p>
              {scorePercentage !== null && (
                <p className="text-sm text-muted-foreground">{scorePercentage}%</p>
              )}
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-950/30">
              <p className="text-sm text-green-600 dark:text-green-400">Correct</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">{correctCount}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950/30">
              <p className="text-sm text-red-600 dark:text-red-400">Incorrect</p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-400">{incorrectCount}</p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center dark:border-yellow-800 dark:bg-yellow-950/30">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
              <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{pendingCount}</p>
            </div>
          </div>

          {hasPendingGrading && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Some short answer questions require manual grading. Your final score will be
                updated once all questions have been graded by the instructor.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Question Review</h2>
        {quiz.questions.map((question, index) => {
          const result = questionResults.find((r) => r.questionIndex === index)
          return (
            <QuizQuestionComponent
              key={index}
              question={question}
              questionNumber={index + 1}
              value={answers[index]}
              onChange={() => {}}
              disabled
              showResult={
                result
                  ? {
                      correct: result.correct,
                      correctAnswer: quiz.showAnswers ? result.correctAnswer : undefined,
                      pointsEarned: result.pointsEarned,
                    }
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
