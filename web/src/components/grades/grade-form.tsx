'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2Icon, SaveIcon } from 'lucide-react'
import { toast } from 'sonner'

interface RubricItem {
  criteria: string
  points: number
}

interface GradeFormProps {
  courseId: string
  studentId: string
  studentName: string
  assignmentPath: string
  assignmentTitle: string
  pointsPossible: number
  rubric?: RubricItem[]
  submissionId?: string
  existingGrade?: {
    points_earned: number | null
    feedback: string | null
    rubric_scores: Record<string, number> | null
  }
}

export function GradeForm({
  courseId,
  studentId,
  studentName,
  assignmentPath,
  assignmentTitle,
  pointsPossible,
  rubric,
  submissionId,
  existingGrade,
}: GradeFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pointsEarned, setPointsEarned] = useState<string>(
    existingGrade?.points_earned?.toString() || ''
  )
  const [feedback, setFeedback] = useState(existingGrade?.feedback || '')
  const [rubricScores, setRubricScores] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(existingGrade?.rubric_scores || {}).map(([k, v]) => [k, v.toString()])
    )
  )

  const handleRubricScoreChange = (criteria: string, value: string) => {
    setRubricScores((prev) => ({ ...prev, [criteria]: value }))

    // Auto-calculate total if rubric exists
    if (rubric) {
      const total = rubric.reduce((sum, item) => {
        const score = criteria === item.criteria
          ? parseFloat(value) || 0
          : parseFloat(rubricScores[item.criteria]) || 0
        return sum + score
      }, 0)
      setPointsEarned(total.toString())
    }
  }

  const handleSubmit = async () => {
    const points = parseFloat(pointsEarned)
    if (isNaN(points) || points < 0) {
      toast.error('Please enter a valid score')
      return
    }

    if (points > pointsPossible) {
      toast.error(`Score cannot exceed ${pointsPossible} points`)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submissionId || null,
          courseId,
          studentId,
          assignmentPath,
          pointsEarned: points,
          pointsPossible,
          feedback: feedback.trim() || null,
          rubricScores: rubric
            ? Object.fromEntries(
                Object.entries(rubricScores).map(([k, v]) => [k, parseFloat(v) || 0])
              )
            : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save grade')
      }

      toast.success('Grade saved successfully')
      router.push(`/courses/${courseId}/gradebook`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save grade')
    } finally {
      setIsSubmitting(false)
    }
  }

  const percentage = pointsEarned
    ? Math.round((parseFloat(pointsEarned) / pointsPossible) * 100)
    : null

  const getGradeLabel = (pct: number) => {
    if (pct >= 90) return { label: 'A', color: 'bg-green-500' }
    if (pct >= 80) return { label: 'B', color: 'bg-blue-500' }
    if (pct >= 70) return { label: 'C', color: 'bg-yellow-500' }
    if (pct >= 60) return { label: 'D', color: 'bg-orange-500' }
    return { label: 'F', color: 'bg-red-500' }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Grade Submission</CardTitle>
            <CardDescription className="mt-2">
              <span className="font-medium">{studentName}</span> -{' '}
              <span>{assignmentTitle}</span>
            </CardDescription>
          </div>
          {percentage !== null && (
            <div className="text-right">
              <Badge className={getGradeLabel(percentage).color}>
                {getGradeLabel(percentage).label}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">{percentage}%</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {rubric && rubric.length > 0 && (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Rubric Scores</Label>
            {rubric.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.criteria}</p>
                  <p className="text-xs text-muted-foreground">Max: {item.points} pts</p>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="0"
                    max={item.points}
                    step="0.5"
                    value={rubricScores[item.criteria] || ''}
                    onChange={(e) =>
                      handleRubricScoreChange(item.criteria, e.target.value)
                    }
                    disabled={isSubmitting}
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="points">
            Total Score <span className="text-muted-foreground">(out of {pointsPossible})</span>
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="points"
              type="number"
              min="0"
              max={pointsPossible}
              step="0.5"
              value={pointsEarned}
              onChange={(e) => setPointsEarned(e.target.value)}
              disabled={isSubmitting}
              className="w-32"
              placeholder="0"
            />
            <span className="text-muted-foreground">/ {pointsPossible}</span>
            {percentage !== null && (
              <span className="text-muted-foreground ml-2">({percentage}%)</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback">Feedback (optional)</Label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isSubmitting}
            placeholder="Provide feedback to the student..."
            className="min-h-[150px]"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <SaveIcon className="h-4 w-4 mr-2" />
              Save Grade
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
