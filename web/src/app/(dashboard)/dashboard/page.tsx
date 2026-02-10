import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { getTimeOfDay } from '@/lib/date-utils'

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

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', user!.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

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
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Good {getTimeOfDay()}, {firstName}</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening in your courses.
          </p>
        </div>
        {/* Stats Cards */}
        <div className="ml-auto flex flex-row flex-nowrap items-start justify-end gap-2">
          <Card className="h-16 min-w-[170px]">
            <CardContent className="flex h-full items-center justify-between gap-3 px-3 py-0">
              <p className="text-xs text-muted-foreground">Enrolled Courses</p>
              <p className="text-xl font-semibold leading-none">{enrollments?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="h-16 min-w-[170px]">
            <CardContent className="flex h-full items-center justify-between gap-3 px-3 py-0">
              <p className="text-xs text-muted-foreground">Unread Notifications</p>
              <p className="text-xl font-semibold leading-none">{unreadCount || 0}</p>
            </CardContent>
          </Card>
          <Card className="h-16 min-w-[170px]">
            <CardContent className="flex h-full items-center justify-between gap-3 px-3 py-0">
              <p className="text-xs text-muted-foreground">Recent Announcements</p>
              <p className="text-xl font-semibold leading-none">{announcements?.length || 0}</p>
            </CardContent>
          </Card>
        </div>
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
                    className="block border p-4 transition-colors hover:bg-accent"
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
                    <Link
                      key={announcement.id}
                      href={`/courses/${announcement.course_id}/announcements/${announcement.id}`}
                      className="block border p-4 transition-colors hover:bg-accent"
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
                    </Link>
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
