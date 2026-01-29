import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AssignmentView, AssignmentData } from '@/components/assignments/assignment-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, EditIcon, FileTextIcon } from 'lucide-react'

interface AssignmentPageProps {
  params: Promise<{
    courseId: string
    assignmentPath: string
  }>
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { courseId, assignmentPath } = await params
  const decodedPath = decodeURIComponent(assignmentPath)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get enrollment to check role
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) {
    redirect('/courses')
  }

  // Get course with published version
  const { data: course } = await supabase
    .from('courses')
    .select(`
      *,
      institution:institutions(id, name),
      published_version:course_versions!fk_published_version(*)
    `)
    .eq('id', courseId)
    .single()

  if (!course || !course.published_version) {
    notFound()
  }

  // For now, create mock assignment data since we can't read from storage directly
  // In production, this would fetch from Supabase Storage
  const assignment: AssignmentData = {
    type: 'assignment',
    title: decodedPath.split('/').pop()?.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Assignment',
    instructions: 'Complete this assignment according to the requirements outlined below.\n\nPlease submit your work before the due date. Late submissions may be penalized.',
    points: 100,
    dueDate: null,
    submissionTypes: ['text', 'file'],
    rubric: [
      { criteria: 'Content Quality', points: 40 },
      { criteria: 'Organization', points: 30 },
      { criteria: 'Formatting', points: 20 },
      { criteria: 'Timeliness', points: 10 },
    ],
  }

  const moduleName = decodedPath.split('/').slice(0, -1).pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // Get user's submission for this assignment
  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .eq('assignment_path', decodedPath)
    .single()

  // Get grade if exists
  const { data: grade } = await supabase
    .from('grades')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .eq('assignment_path', decodedPath)
    .single()

  const isStudent = enrollment.role === 'student'
  const isStaff = enrollment.role === 'teacher' || enrollment.role === 'ta'

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not submitted'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = () => {
    if (grade) {
      return <Badge className="bg-green-500">Graded</Badge>
    }
    if (submission?.status === 'submitted') {
      return <Badge>Submitted</Badge>
    }
    if (submission?.status === 'draft') {
      return <Badge variant="secondary">Draft</Badge>
    }
    return <Badge variant="outline">Not Submitted</Badge>
  }

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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssignmentView assignment={assignment} moduleName={moduleName} />
        </div>

        <div className="space-y-6">
          {/* Submission Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Submission Status
                {getStatusBadge()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Submitted: {formatDate(submission.submitted_at)}</span>
                  </div>
                  {submission.text_content && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Submission Preview:</p>
                      <div className="bg-muted p-3 rounded-md text-sm">
                        <p className="line-clamp-3">{submission.text_content}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t submitted this assignment yet.
                </p>
              )}

              {isStudent && !grade && (
                <Link href={`/courses/${courseId}/assignments/${assignmentPath}/submit`}>
                  <Button className="w-full">
                    {submission ? (
                      <>
                        <EditIcon className="h-4 w-4 mr-2" />
                        Edit Submission
                      </>
                    ) : (
                      <>
                        <FileTextIcon className="h-4 w-4 mr-2" />
                        Submit Assignment
                      </>
                    )}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Grade Card */}
          {grade && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  Grade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {grade.points_earned ?? 0}
                    <span className="text-xl text-muted-foreground">
                      /{grade.points_possible}
                    </span>
                  </p>
                  <p className="text-lg text-muted-foreground">
                    {Math.round(((grade.points_earned ?? 0) / grade.points_possible) * 100)}%
                  </p>
                </div>

                {grade.feedback && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium">Feedback:</p>
                    <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                      {grade.feedback}
                    </div>
                  </div>
                )}

                {grade.rubric_scores && typeof grade.rubric_scores === 'object' && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium">Rubric Breakdown:</p>
                    <div className="space-y-2">
                      {Object.entries(grade.rubric_scores as Record<string, number>).map(([criteria, score]) => (
                        <div key={criteria} className="flex justify-between text-sm">
                          <span>{criteria}</span>
                          <span className="font-medium">{score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground pt-2">
                  Graded: {formatDate(grade.graded_at)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Staff Actions */}
          {isStaff && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Teacher Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/courses/${courseId}/gradebook`}>
                  <Button variant="outline" className="w-full">
                    View Gradebook
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
