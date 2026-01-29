import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, FileTextIcon } from 'lucide-react'

interface GradesPageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function GradesPage({ params }: GradesPageProps) {
  const { courseId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) {
    redirect('/courses')
  }

  // Students only - teachers use gradebook
  if (enrollment.role !== 'student') {
    redirect(`/courses/${courseId}/gradebook`)
  }

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, code')
    .eq('id', courseId)
    .single()

  if (!course) {
    redirect('/courses')
  }

  // Get all grades for this student in this course
  const { data: grades } = await supabase
    .from('grades')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .order('graded_at', { ascending: false })

  // Get all submissions to show pending
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)

  // Create a map of submissions by assignment path
  const submissionMap = new Map(
    submissions?.map((s) => [s.assignment_path, s]) || []
  )

  // Create a map of grades by assignment path
  const gradeMap = new Map(grades?.map((g) => [g.assignment_path, g]) || [])

  // Mock assignments list - in production this would come from course storage
  const mockAssignments = [
    { path: 'modules/01-introduction/assignment.json', title: 'Introduction Assignment', points: 100 },
    { path: 'modules/02-fundamentals/assignment.json', title: 'Fundamentals Assignment', points: 100 },
    { path: 'modules/03-advanced/assignment.json', title: 'Advanced Assignment', points: 100 },
  ]

  // Calculate totals
  const totalPossible = mockAssignments.reduce((sum, a) => sum + a.points, 0)
  const totalEarned = grades?.reduce((sum, g) => sum + (g.points_earned || 0), 0) || 0
  const overallPercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return { letter: 'A', color: 'text-green-600 dark:text-green-400' }
    if (percentage >= 80) return { letter: 'B', color: 'text-blue-600 dark:text-blue-400' }
    if (percentage >= 70) return { letter: 'C', color: 'text-yellow-600 dark:text-yellow-400' }
    if (percentage >= 60) return { letter: 'D', color: 'text-orange-600 dark:text-orange-400' }
    return { letter: 'F', color: 'text-red-600 dark:text-red-400' }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const letterGrade = getLetterGrade(overallPercentage)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/courses/${courseId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Grades</h1>
        <p className="text-muted-foreground">
          {course.code} - {course.name}
        </p>
      </div>

      {/* Overall Grade Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Grade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${letterGrade.color}`}>
                {letterGrade.letter}
              </span>
              <span className="text-2xl text-muted-foreground">
                {overallPercentage}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Points Earned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEarned}
              <span className="text-lg text-muted-foreground">
                /{totalPossible}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Graded Assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {grades?.length || 0}
              <span className="text-lg text-muted-foreground">
                /{mockAssignments.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Grades</CardTitle>
          <CardDescription>
            Your grades for all assignments in this course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
                <TableHead className="text-right">Graded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAssignments.map((assignment) => {
                const grade = gradeMap.get(assignment.path)
                const submission = submissionMap.get(assignment.path)
                const percentage = grade
                  ? Math.round(((grade.points_earned || 0) / grade.points_possible) * 100)
                  : null

                return (
                  <TableRow key={assignment.path}>
                    <TableCell>
                      <Link
                        href={`/courses/${courseId}/assignments/${encodeURIComponent(assignment.path)}`}
                        className="font-medium hover:underline flex items-center gap-2"
                      >
                        <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                        {assignment.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {grade ? (
                        <Badge className="bg-green-500 gap-1">
                          <CheckCircleIcon className="h-3 w-3" />
                          Graded
                        </Badge>
                      ) : submission ? (
                        <Badge variant="secondary" className="gap-1">
                          <ClockIcon className="h-3 w-3" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Submitted</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {grade ? (
                        <span>
                          {grade.points_earned ?? 0}/{grade.points_possible}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {percentage !== null ? (
                        <span className={getLetterGrade(percentage).color}>
                          {percentage}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(grade?.graded_at || null)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      {grades && grades.length > 0 && grades.some((g) => g.feedback) && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
            <CardDescription>
              Feedback from your graded assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {grades
              .filter((g) => g.feedback)
              .slice(0, 3)
              .map((grade) => {
                const assignment = mockAssignments.find(
                  (a) => a.path === grade.assignment_path
                )

                return (
                  <div key={grade.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/courses/${courseId}/assignments/${encodeURIComponent(grade.assignment_path)}`}
                        className="font-medium hover:underline"
                      >
                        {assignment?.title || grade.assignment_path}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {grade.points_earned ?? 0}/{grade.points_possible} pts
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {grade.feedback}
                    </p>
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
