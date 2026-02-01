import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeftIcon, UsersIcon, MailIcon, CalendarIcon } from 'lucide-react'

interface StudentsPageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function StudentsPage({ params }: StudentsPageProps) {
  const { courseId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment - only teachers and TAs can access students page
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

  // Get all students enrolled in the course
  const { data: studentEnrollments } = await supabase
    .from('enrollments')
    .select(`
      user_id,
      enrolled_at,
      user:users(id, full_name, email, avatar_url)
    `)
    .eq('course_id', courseId)
    .eq('role', 'student')
    .order('enrolled_at', { ascending: true })

  const students = (studentEnrollments || []).map((e) => ({
    ...e.user as {
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
    },
    enrolledAt: e.enrolled_at,
  }))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
        <Link href={`/courses/${courseId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            {course.code} - {course.name}
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Students</CardDescription>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
          <CardDescription>
            Students currently enrolled in this course
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length > 0 ? (
            <div className="divide-y">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(student.full_name, student.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {student.full_name || 'Unnamed Student'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <MailIcon className="h-3 w-3" />
                        {student.email}
                      </span>
                      {student.enrolledAt && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          Enrolled {formatDate(student.enrolledAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/courses/${courseId}/gradebook?student=${student.id}`}>
                    <Button variant="outline" size="sm">
                      View Grades
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
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
