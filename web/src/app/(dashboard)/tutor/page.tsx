import { createClient } from '@/lib/supabase/server'
import { ModernChatInterface } from '@/components/chat/modern-chat-interface'
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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Tutor</h1>
          <p className="text-sm text-muted-foreground">
            Your personal learning companion
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-primary"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="M5 3v4" />
          <path d="M19 17v4" />
          <path d="M3 5h4" />
          <path d="M17 19h4" />
        </svg>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ModernChatInterface
          initialMessages={messages}
          courses={courses}
          userName={profile?.full_name ?? null}
          type="tutor"
          apiEndpoint="/api/tutor/chat"
          clearEndpoint="/api/tutor/history"
        />
      </div>
    </div>
  )
}
