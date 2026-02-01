import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeftIcon,
  UsersIcon,
  FileTextIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  BarChart3Icon,
} from 'lucide-react'

interface AnalyticsPageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { courseId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment - only teachers and TAs can access analytics
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
    redirect('/courses')
  }

  // Get enrollment counts
  const { count: studentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('role', 'student')

  const { count: staffCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .in('role', ['teacher', 'ta'])

  // Get submission stats
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, status, submitted_at')
    .eq('course_id', courseId)

  const totalSubmissions = submissions?.length || 0
  const submittedCount = submissions?.filter(s => s.status === 'submitted').length || 0

  // Get grade stats
  const { data: grades } = await supabase
    .from('grades')
    .select('points_earned, points_possible')
    .eq('course_id', courseId)

  const gradedCount = grades?.length || 0
  const averageScore = gradedCount > 0
    ? Math.round(
        grades!.reduce((sum, g) => sum + ((g.points_earned || 0) / g.points_possible) * 100, 0) / gradedCount
      )
    : 0

  // Get quiz attempt stats
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('id, score, max_score, submitted_at')
    .eq('course_id', courseId)

  const completedQuizzes = quizAttempts?.filter(q => q.submitted_at).length || 0
  const averageQuizScore = completedQuizzes > 0
    ? Math.round(
        quizAttempts!
          .filter(q => q.submitted_at && q.max_score && q.max_score > 0)
          .reduce((sum, q) => sum + ((q.score || 0) / q.max_score!) * 100, 0) / completedQuizzes
      )
    : 0

  // Get announcement count
  const { count: announcementCount } = await supabase
    .from('announcements')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)

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
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            {course.code} - {course.name}
          </p>
        </div>
      </div>

      {/* Enrollment Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Enrollment</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Students</CardDescription>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studentCount || 0}</div>
              <p className="text-xs text-muted-foreground">enrolled students</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Staff</CardDescription>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staffCount || 0}</div>
              <p className="text-xs text-muted-foreground">teachers & TAs</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assignment Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Assignments</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Submissions</CardDescription>
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">total submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Pending</CardDescription>
              <ClockIcon className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{submittedCount}</div>
              <p className="text-xs text-muted-foreground">awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Graded</CardDescription>
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{gradedCount}</div>
              <p className="text-xs text-muted-foreground">completed grades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Average Score</CardDescription>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {averageScore > 0 ? `${averageScore}%` : '-'}
              </div>
              <p className="text-xs text-muted-foreground">assignment average</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quiz Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quizzes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Completed Attempts</CardDescription>
              <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedQuizzes}</div>
              <p className="text-xs text-muted-foreground">quiz completions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Average Quiz Score</CardDescription>
              <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {averageQuizScore > 0 ? `${averageQuizScore}%` : '-'}
              </div>
              <p className="text-xs text-muted-foreground">across all quizzes</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Activity</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Announcements</CardDescription>
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{announcementCount || 0}</div>
              <p className="text-xs text-muted-foreground">posted announcements</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
