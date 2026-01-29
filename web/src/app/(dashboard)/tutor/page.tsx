import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatInterface } from '@/components/tutor/chat-interface'
import type { Tables } from '@/types/database'

interface TutorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  course_id: string | null
  created_at: string | null
}

export default async function TutorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Get student tutor record (may not exist yet)
  const { data: tutor } = await supabase
    .from('student_tutors')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Get recent messages if tutor exists
  let messages: TutorMessage[] = []
  if (tutor) {
    const { data: tutorMessages } = await supabase
      .from('tutor_messages')
      .select('id, role, content, course_id, created_at')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: true })
      .limit(50)

    if (tutorMessages) {
      messages = tutorMessages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        course_id: m.course_id,
        created_at: m.created_at,
      }))
    }
  }

  // Get enrolled courses for context selector
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      course_id,
      courses (*)
    `)
    .eq('user_id', user.id)

  const courses: Tables<'courses'>[] = enrollments
    ? enrollments
        .map((e) => e.courses as Tables<'courses'>)
        .filter(Boolean)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Tutor</h1>
        <p className="text-muted-foreground">
          Your personal AI tutor with access to all your course materials
        </p>
      </div>

      <Card className="flex h-[calc(100vh-16rem)] flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 border-b py-4">
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Ask questions about your courses, get help with assignments, or explore topics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ChatInterface
            initialMessages={messages}
            courses={courses}
            userName={profile?.full_name ?? null}
          />
        </CardContent>
      </Card>
    </div>
  )
}
