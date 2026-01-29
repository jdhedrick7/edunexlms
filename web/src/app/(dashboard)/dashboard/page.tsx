import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function DashboardPage() {
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
    .limit(6)

  // Get recent announcements from enrolled courses
  const courseIds = enrollments?.map(e => e.course_id) || []
  const { data: announcements } = courseIds.length > 0
    ? await supabase
        .from('announcements')
        .select(`
          *,
          course:courses(name, code),
          author:users(full_name)
        `)
        .in('course_id', courseIds)
        .lte('publish_at', new Date().toISOString())
        .order('publish_at', { ascending: false })
        .limit(5)
    : { data: [] }

  // Get unread notifications count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .is('read_at', null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening in your courses.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Courses */}
        <Card>
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
            <CardDescription>Courses you&apos;re enrolled in</CardDescription>
          </CardHeader>
          <CardContent>
            {enrollments && enrollments.length > 0 ? (
              <div className="space-y-4">
                {enrollments.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${enrollment.course_id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{enrollment.course?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {enrollment.course?.code} &middot; {enrollment.role}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You&apos;re not enrolled in any courses yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
            <CardDescription>Latest updates from your courses</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements && announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {announcement.course?.code} &middot; {announcement.author?.full_name}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(announcement.publish_at!).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No announcements yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
