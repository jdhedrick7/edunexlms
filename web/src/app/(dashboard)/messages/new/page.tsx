import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NewConversationForm } from './new-conversation-form'

export default async function NewMessagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's enrollments with course details
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(
        id,
        name,
        code,
        institution:institutions(name)
      )
    `)
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })

  // Build courses list for selection
  const courses = (enrollments || [])
    .filter(e => e.course)
    .map(e => ({
      id: e.course!.id,
      name: e.course!.name,
      code: e.course!.code,
      institutionName: (e.course as unknown as { institution: { name: string } | null })?.institution?.name || '',
      role: e.role
    }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/messages">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="sr-only">Back to messages</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Message</h1>
          <p className="text-muted-foreground">
            Start a conversation with course members
          </p>
        </div>
      </div>

      {courses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
          </CardHeader>
          <CardContent>
            <NewConversationForm courses={courses} currentUserId={user.id} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">No courses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You need to be enrolled in a course to message other members.
            </p>
            <Button asChild className="mt-4">
              <Link href="/courses">View Courses</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
