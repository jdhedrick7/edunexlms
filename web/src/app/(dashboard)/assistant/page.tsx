import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ModernChatInterface } from '@/components/chat/modern-chat-interface'

interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  course_id: string | null
  created_at: string | null
}

export default async function AssistantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Check if user is a teacher or TA in any course
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('role, course_id')
    .eq('user_id', user.id)
    .in('role', ['teacher', 'ta'])

  // Also check institution-level teacher/ta role
  const { data: memberships } = await supabase
    .from('institution_members')
    .select('role, institution_id')
    .eq('user_id', user.id)
    .in('role', ['teacher', 'ta', 'admin'])

  const isTeacherOrTA = (enrollments && enrollments.length > 0) ||
                        (memberships && memberships.length > 0)

  if (!isTeacherOrTA) {
    redirect('/dashboard')
  }

  // Get or create teacher assistant record
  let assistant = null
  const { data: existingAssistant } = await supabase
    .from('teacher_assistants')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (existingAssistant) {
    assistant = existingAssistant
  } else if (memberships && memberships.length > 0) {
    // Create a new assistant record
    const institutionId = memberships[0].institution_id
    const agentMdPath = `teachers/${user.id}/agent.md`

    const { data: newAssistant } = await supabase
      .from('teacher_assistants')
      .insert({
        institution_id: institutionId,
        user_id: user.id,
        agent_md_path: agentMdPath
      })
      .select()
      .single()

    assistant = newAssistant
  }

  // Get recent messages if assistant exists
  let messages: AssistantMessage[] = []
  if (assistant) {
    const { data: assistantMessages } = await supabase
      .from('teacher_messages')
      .select('id, role, content, course_id, created_at')
      .eq('assistant_id', assistant.id)
      .order('created_at', { ascending: true })
      .limit(50)

    if (assistantMessages) {
      messages = assistantMessages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        course_id: m.course_id,
        created_at: m.created_at,
      }))
    }
  }

  // Get teacher's courses
  const courseIds = enrollments?.map(e => e.course_id) || []
  const { data: courses } = courseIds.length > 0
    ? await supabase
        .from('courses')
        .select('*')
        .in('id', courseIds)
    : { data: [] }

  // If no courses from enrollments, try to get courses from institution
  let allCourses = courses || []
  if (allCourses.length === 0 && memberships && memberships.length > 0) {
    const { data: institutionCourses } = await supabase
      .from('courses')
      .select('*')
      .in('institution_id', memberships.map(m => m.institution_id))
    allCourses = institutionCourses || []
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Your teaching companion
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
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ModernChatInterface
          initialMessages={messages}
          courses={allCourses}
          userName={profile?.full_name ?? null}
          type="assistant"
          apiEndpoint="/api/assistant/chat"
        />
      </div>
    </div>
  )
}
