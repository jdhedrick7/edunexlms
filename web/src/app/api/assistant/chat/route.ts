import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// System prompt for the teacher assistant
const SYSTEM_PROMPT = `You are an AI teaching assistant for EduNex LMS. You help teachers and TAs manage their courses, understand student progress, and improve their teaching.

Your capabilities include:
- Answering questions about course content and structure
- Discussing student progress and identifying struggling students
- Suggesting improvements to course materials
- Helping draft announcements, assignments, and quizzes
- Explaining pedagogical best practices
- Eventually triggering course edits (this feature is coming soon)

Guidelines:
- Be professional, helpful, and concise
- Focus on actionable advice
- When discussing student data, maintain privacy and speak in general terms unless asked about specifics
- For course edit requests, acknowledge them and explain that the edit system is being developed
- Always consider the learning outcomes when suggesting changes

When the teacher provides course context, use that information to give more specific advice.`

interface ChatRequest {
  message: string
  courseId?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a teacher or TA
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['teacher', 'ta'])

    const { data: memberships } = await supabase
      .from('institution_members')
      .select('role, institution_id')
      .eq('user_id', user.id)
      .in('role', ['teacher', 'ta', 'admin'])

    const isTeacherOrTA = (enrollments && enrollments.length > 0) ||
                          (memberships && memberships.length > 0)

    if (!isTeacherOrTA) {
      return Response.json({ error: 'Forbidden - Teachers and TAs only' }, { status: 403 })
    }

    const body: ChatRequest = await request.json()
    const { message, courseId } = body

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get or create assistant record
    let assistant = null
    const { data: existingAssistant } = await supabase
      .from('teacher_assistants')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingAssistant) {
      assistant = existingAssistant
    } else if (memberships && memberships.length > 0) {
      const institutionId = memberships[0].institution_id
      const agentMdPath = `teachers/${user.id}/agent.md`

      const { data: newAssistant, error: createError } = await supabase
        .from('teacher_assistants')
        .insert({
          institution_id: institutionId,
          user_id: user.id,
          agent_md_path: agentMdPath
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create assistant:', createError)
        return Response.json({ error: 'Failed to create assistant' }, { status: 500 })
      }

      assistant = newAssistant
    }

    if (!assistant) {
      return Response.json({ error: 'Could not find or create assistant' }, { status: 500 })
    }

    // Get course context if provided
    let courseContext = ''
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments (
            role
          )
        `)
        .eq('id', courseId)
        .single()

      if (course) {
        // Get student count
        const { count: studentCount } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('role', 'student')

        courseContext = `
Current course context:
- Course: ${course.code} - ${course.name}
- Description: ${course.description || 'No description'}
- Students enrolled: ${studentCount || 0}
`
      }
    }

    // Get teacher's courses for context
    const { data: teacherCourses } = await supabase
      .from('enrollments')
      .select(`
        course:courses (
          id,
          code,
          name
        )
      `)
      .eq('user_id', user.id)
      .in('role', ['teacher', 'ta'])

    const coursesContext = teacherCourses && teacherCourses.length > 0
      ? `\n\nTeacher's courses:\n${teacherCourses.map(e => {
          const course = e.course as { id: string; code: string; name: string } | null
          return course ? `- ${course.code}: ${course.name}` : null
        }).filter(Boolean).join('\n')}`
      : ''

    // Try to load agent.md from storage (if it exists)
    let agentContext = ''
    try {
      const bucketName = `inst-${assistant.institution_id}`
      const { data: agentFile } = await supabase
        .storage
        .from(bucketName)
        .download(assistant.agent_md_path)

      if (agentFile) {
        agentContext = `\n\nTeacher memory/notes:\n${await agentFile.text()}`
      }
    } catch {
      // Agent.md doesn't exist yet, that's fine
    }

    // Get recent conversation history
    const { data: recentMessages } = await supabase
      .from('teacher_messages')
      .select('role, content')
      .eq('assistant_id', assistant.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const conversationHistory = recentMessages
      ? recentMessages.reverse().map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      : []

    // Save user message to database
    const { error: saveUserError } = await supabase
      .from('teacher_messages')
      .insert({
        assistant_id: assistant.id,
        course_id: courseId || null,
        role: 'user',
        content: message
      })

    if (saveUserError) {
      console.error('Failed to save user message:', saveUserError)
    }

    // Check for API key
    if (!OPENROUTER_API_KEY) {
      // Return a placeholder response if no API key
      const placeholderResponse = "I'm your AI teaching assistant. Currently, the AI service is not configured. Please ensure the OPENROUTER_API_KEY environment variable is set to enable AI responses."

      await supabase
        .from('teacher_messages')
        .insert({
          assistant_id: assistant.id,
          course_id: courseId || null,
          role: 'assistant',
          content: placeholderResponse
        })

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: placeholderResponse })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Build messages for the API
    const apiMessages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + courseContext + coursesContext + agentContext
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenRouter API
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'EduNex LMS Teacher Assistant'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: apiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      console.error('OpenRouter API error:', errorText)
      return Response.json({ error: 'AI service error' }, { status: 502 })
    }

    if (!openRouterResponse.body) {
      return Response.json({ error: 'No response from AI service' }, { status: 502 })
    }

    // Stream the response
    const reader = openRouterResponse.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  continue
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    fullContent += content
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Save assistant response to database
          if (fullContent) {
            const { error: saveAssistantError } = await supabase
              .from('teacher_messages')
              .insert({
                assistant_id: assistant.id,
                course_id: courseId || null,
                role: 'assistant',
                content: fullContent
              })

            if (saveAssistantError) {
              console.error('Failed to save assistant message:', saveAssistantError)
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Stream processing error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream processing error' })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
