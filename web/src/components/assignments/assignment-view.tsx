'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, ClipboardListIcon, FileTextIcon } from 'lucide-react'

export interface RubricItem {
  criteria: string
  points: number
}

export interface AssignmentData {
  type: 'assignment'
  title: string
  instructions: string
  points: number
  dueDate: string | null
  submissionTypes: ('text' | 'file')[]
  rubric?: RubricItem[]
}

interface AssignmentViewProps {
  assignment: AssignmentData
  moduleName?: string
}

export function AssignmentView({ assignment, moduleName }: AssignmentViewProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isOverdue = assignment.dueDate
    ? new Date(assignment.dueDate) < new Date()
    : false

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              {moduleName && (
                <p className="text-sm text-muted-foreground mb-1">{moduleName}</p>
              )}
              <CardTitle className="text-2xl">{assignment.title}</CardTitle>
              <CardDescription className="mt-2 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <ClipboardListIcon className="h-4 w-4" />
                  {assignment.points} points
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  {formatDate(assignment.dueDate)}
                </span>
              </CardDescription>
            </div>
            {isOverdue && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              Instructions
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {assignment.instructions}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Submission Types</h3>
            <div className="flex gap-2">
              {assignment.submissionTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {type === 'text' ? 'Text Entry' : 'File Upload'}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {assignment.rubric && assignment.rubric.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rubric</CardTitle>
            <CardDescription>
              Your submission will be graded based on the following criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignment.rubric.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span>{item.criteria}</span>
                  <Badge variant="outline">{item.points} pts</Badge>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 font-semibold">
                <span>Total</span>
                <span>{assignment.points} pts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
