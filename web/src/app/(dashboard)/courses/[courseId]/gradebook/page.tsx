import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GradeTable } from '@/components/grades/grade-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon, BarChart3Icon, DownloadIcon, UsersIcon } from 'lucide-react'

interface GradebookPageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function GradebookPage({ params }: GradebookPageProps) {
  const { courseId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment - only teachers and TAs can access gradebook
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role === 'student') {
    redirect(`/courses/${courseId}/grades`)
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

  // Get all students enrolled in the course
  const { data: studentEnrollments } = await supabase
    .from('enrollments')
    .select(`
      user_id,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('course_id', courseId)
    .eq('role', 'student')

  // Get all submissions for this course
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('course_id', courseId)

  // Get all grades for this course
  const { data: grades } = await supabase
    .from('grades')
    .select('*')
    .eq('course_id', courseId)

  // Mock assignments - in production this would come from course storage
  const mockAssignments = [
    { path: 'modules/01-introduction/assignment.json', title: 'Introduction Assignment', points: 100 },
    { path: 'modules/02-fundamentals/assignment.json', title: 'Fundamentals Assignment', points: 100 },
    { path: 'modules/03-advanced/assignment.json', title: 'Advanced Assignment', points: 100 },
  ]

  // Create submission and grade maps
  const submissionMap = new Map<string, Map<string, typeof submissions extends (infer T)[] | null ? T : never>>()
  const gradeMap = new Map<string, Map<string, typeof grades extends (infer T)[] | null ? T : never>>()

  submissions?.forEach((s) => {
    if (!submissionMap.has(s.user_id)) {
      submissionMap.set(s.user_id, new Map())
    }
    submissionMap.get(s.user_id)!.set(s.assignment_path, s)
  })

  grades?.forEach((g) => {
    if (!gradeMap.has(g.user_id)) {
      gradeMap.set(g.user_id, new Map())
    }
    gradeMap.get(g.user_id)!.set(g.assignment_path, g)
  })

  // Build student grades data
  const studentGrades = (studentEnrollments || []).map((e) => {
    const student = e.user as {
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
    }
    const userSubmissions = submissionMap.get(student.id) || new Map()
    const userGrades = gradeMap.get(student.id) || new Map()

    const submissionsRecord: Record<string, {
      id: string
      status: string | null
      submitted_at: string | null
      grade?: {
        points_earned: number | null
        points_possible: number
      } | null
    } | undefined> = {}

    let totalPoints = 0
    let earnedPoints = 0

    mockAssignments.forEach((a) => {
      const submission = userSubmissions.get(a.path)
      const grade = userGrades.get(a.path)

      if (submission) {
        submissionsRecord[a.path] = {
          id: submission.id,
          status: submission.status,
          submitted_at: submission.submitted_at,
          grade: grade
            ? {
                points_earned: grade.points_earned,
                points_possible: grade.points_possible,
              }
            : null,
        }
      }

      if (grade) {
        totalPoints += grade.points_possible
        earnedPoints += grade.points_earned || 0
      }
    })

    return {
      student,
      submissions: submissionsRecord,
      totalPoints,
      earnedPoints,
    }
  })

  // Calculate statistics
  const totalStudents = studentGrades.length
  const studentsWithGrades = studentGrades.filter((s) => s.totalPoints > 0).length
  const averageGrade =
    studentsWithGrades > 0
      ? Math.round(
          studentGrades
            .filter((s) => s.totalPoints > 0)
            .reduce((sum, s) => sum + (s.earnedPoints / s.totalPoints) * 100, 0) /
            studentsWithGrades
        )
      : 0

  const pendingSubmissions = submissions?.filter((s) => {
    const grade = grades?.find(
      (g) => g.user_id === s.user_id && g.assignment_path === s.assignment_path
    )
    return s.status === 'submitted' && !grade
  }).length || 0

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gradebook</h1>
          <p className="text-muted-foreground">
            {course.code} - {course.name}
          </p>
        </div>
        <Button variant="outline" disabled>
          <DownloadIcon className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Students</CardDescription>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Class Average</CardDescription>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageGrade > 0 ? `${averageGrade}%` : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAssignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pending Grades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingSubmissions > 0 ? (
                <span className="text-orange-500">{pendingSubmissions}</span>
              ) : (
                <span className="text-green-500">0</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gradebook Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
          <CardDescription>
            Click on any cell to grade a submission
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentGrades.length > 0 ? (
            <GradeTable
              courseId={courseId}
              students={studentGrades}
              assignments={mockAssignments}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No students enrolled</p>
              <p className="text-sm">
                Students will appear here once they enroll in the course.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
