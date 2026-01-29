import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssistantInterface } from '@/components/assistant/assistant-interface'

export default async function AssistantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
  const { data: messages } = assistant
    ? await supabase
        .from('teacher_messages')
        .select('*')
        .eq('assistant_id', assistant.id)
        .order('created_at', { ascending: true })
        .limit(50)
    : { data: [] }

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">
          Your personal AI assistant for managing courses and helping students
        </p>
      </div>

      <AssistantInterface
        initialMessages={messages || []}
        courses={allCourses}
        assistantId={assistant?.id || null}
      />
    </div>
  )
}
