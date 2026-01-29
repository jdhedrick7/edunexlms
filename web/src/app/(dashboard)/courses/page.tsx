import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's enrollments with course details
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(
        *,
        institution:institutions(name)
      )
    `)
    .eq('user_id', user!.id)
    .order('enrolled_at', { ascending: false })

  // Group by role
  const teachingCourses = enrollments?.filter(e => e.role === 'teacher') || []
  const taCourses = enrollments?.filter(e => e.role === 'ta') || []
  const studentCourses = enrollments?.filter(e => e.role === 'student') || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        <p className="text-muted-foreground">
          View and manage your courses
        </p>
      </div>

      {/* Teaching */}
      {teachingCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Teaching</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teachingCourses.map((enrollment) => (
              <Link key={enrollment.id} href={`/courses/${enrollment.course_id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{enrollment.course?.name}</CardTitle>
                    <CardDescription>{enrollment.course?.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {enrollment.course?.description || 'No description'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TA */}
      {taCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Teaching Assistant</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {taCourses.map((enrollment) => (
              <Link key={enrollment.id} href={`/courses/${enrollment.course_id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{enrollment.course?.name}</CardTitle>
                    <CardDescription>{enrollment.course?.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {enrollment.course?.description || 'No description'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Student */}
      {studentCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Enrolled</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studentCourses.map((enrollment) => (
              <Link key={enrollment.id} href={`/courses/${enrollment.course_id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{enrollment.course?.name}</CardTitle>
                    <CardDescription>{enrollment.course?.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {enrollment.course?.description || 'No description'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {enrollments?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">No courses yet</p>
            <p className="text-sm text-muted-foreground">
              You&apos;re not enrolled in any courses.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
