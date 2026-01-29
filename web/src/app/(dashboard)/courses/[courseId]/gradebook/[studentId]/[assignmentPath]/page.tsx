import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GradeForm } from '@/components/grades/grade-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeftIcon, ClockIcon, FileTextIcon, UserIcon } from 'lucide-react'

interface GradeSubmissionPageProps {
  params: Promise<{
    courseId: string
    studentId: string
    assignmentPath: string
  }>
}

export default async function GradeSubmissionPage({ params }: GradeSubmissionPageProps) {
  const { courseId, studentId, assignmentPath } = await params
  const decodedPath = decodeURIComponent(assignmentPath)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment - only teachers and TAs can grade
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role === 'student') {
    redirect(`/courses/${courseId}`)
  }

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, code')
    .eq('id', courseId)
    .single()

  if (!course) {
    notFound()
  }

  // Get student info
  const { data: student } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url')
    .eq('id', studentId)
    .single()

  if (!student) {
    notFound()
  }

  // Get submission
  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', studentId)
    .eq('assignment_path', decodedPath)
    .single()

  // Get existing grade
  const { data: existingGrade } = await supabase
    .from('grades')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', studentId)
    .eq('assignment_path', decodedPath)
    .single()

  // Generate assignment data from path - in production this would come from storage
  const assignmentTitle = decodedPath
    .split('/')
    .pop()
    ?.replace('.json', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Assignment'

  const pointsPossible = 100
  const rubric = [
    { criteria: 'Content Quality', points: 40 },
    { criteria: 'Organization', points: 30 },
    { criteria: 'Formatting', points: 20 },
    { criteria: 'Timeliness', points: 10 },
  ]

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

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/courses/${courseId}/gradebook`}>
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Gradebook
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grade Submission</h1>
        <p className="text-muted-foreground">
          {course.code} - {course.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Submission Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5" />
                Student Submission
              </CardTitle>
              <CardDescription>
                {assignmentTitle}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submission ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClockIcon className="h-4 w-4" />
                    Submitted: {formatDate(submission.submitted_at)}
                    <Badge variant="secondary" className="ml-2">
                      {submission.status}
                    </Badge>
                  </div>

                  {submission.text_content ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{submission.text_content}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No text content submitted
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No submission</p>
                  <p className="text-sm">
                    This student has not submitted this assignment yet.
                  </p>
                  <p className="text-sm mt-2">
                    You can still enter a grade if needed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grade Form */}
          <GradeForm
            courseId={courseId}
            studentId={studentId}
            studentName={student.full_name || student.email}
            assignmentPath={decodedPath}
            assignmentTitle={assignmentTitle}
            pointsPossible={pointsPossible}
            rubric={rubric}
            submissionId={submission?.id}
            existingGrade={
              existingGrade
                ? {
                    points_earned: existingGrade.points_earned,
                    feedback: existingGrade.feedback,
                    rubric_scores: existingGrade.rubric_scores as Record<string, number> | null,
                  }
                : undefined
            }
          />
        </div>

        {/* Student Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Student
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={student.avatar_url || undefined}
                    alt={student.full_name || 'Student'}
                  />
                  <AvatarFallback>
                    {getInitials(student.full_name, student.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{student.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium">{assignmentTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Points</span>
                <span className="font-medium">{pointsPossible}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">Not set</span>
              </div>
            </CardContent>
          </Card>

          {existingGrade && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Previous Grade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-medium">
                    {existingGrade.points_earned ?? 0}/{existingGrade.points_possible}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Graded</span>
                  <span className="font-medium">
                    {formatDate(existingGrade.graded_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
