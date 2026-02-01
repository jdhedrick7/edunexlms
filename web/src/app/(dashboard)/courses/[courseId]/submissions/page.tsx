import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftIcon, FileTextIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react'

interface SubmissionsPageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function SubmissionsPage({ params }: SubmissionsPageProps) {
  const { courseId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment - only teachers and TAs can access submissions
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

  // Get all submissions for this course with user info
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      assignment_path,
      status,
      submitted_at,
      user_id,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('course_id', courseId)
    .order('submitted_at', { ascending: false })

  // Get grades to check which are graded
  const { data: grades } = await supabase
    .from('grades')
    .select('user_id, assignment_path')
    .eq('course_id', courseId)

  const gradedSet = new Set(
    (grades || []).map(g => `${g.user_id}:${g.assignment_path}`)
  )

  const submissionList = (submissions || []).map((s) => {
    const student = s.user as {
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
    }
    const isGraded = gradedSet.has(`${s.user_id}:${s.assignment_path}`)
    return {
      ...s,
      student,
      isGraded,
    }
  })

  const pendingCount = submissionList.filter(s => s.status === 'submitted' && !s.isGraded).length
  const gradedCount = submissionList.filter(s => s.isGraded).length

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not submitted'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getAssignmentName = (path: string) => {
    // Extract assignment name from path like "modules/01-intro/assignment.json"
    const parts = path.split('/')
    if (parts.length >= 2) {
      return parts[parts.length - 2].replace(/^\d+-/, '').replace(/-/g, ' ')
    }
    return path
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

  const getStatusBadge = (status: string | null, isGraded: boolean) => {
    if (isGraded) {
      return <Badge variant="default" className="bg-green-500">Graded</Badge>
    }
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'returned':
        return <Badge variant="default">Returned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
          <p className="text-muted-foreground">
            {course.code} - {course.name}
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Submissions</CardDescription>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissionList.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pending Review</CardDescription>
            <ClockIcon className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Graded</CardDescription>
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{gradedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
          <CardDescription>
            Click on a submission to grade it
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissionList.length > 0 ? (
            <div className="divide-y">
              {submissionList.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/courses/${courseId}/gradebook/${submission.user_id}/${encodeURIComponent(submission.assignment_path)}`}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={submission.student.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(submission.student.full_name, submission.student.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {submission.student.full_name || submission.student.email}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {getAssignmentName(submission.assignment_path)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="mb-1">
                      {getStatusBadge(submission.status, submission.isGraded)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(submission.submitted_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No submissions yet</p>
              <p className="text-sm">
                Submissions will appear here when students submit their work.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
