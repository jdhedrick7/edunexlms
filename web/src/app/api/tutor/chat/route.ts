import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Tables, TablesInsert } from '@/types/database'
import { generateEmbedding, formatSearchResults } from '@/lib/embeddings'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'moonshotai/kimi-k2.5'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  message: string
  courseId?: string | null
}

// Default agent instructions for the AI tutor
const DEFAULT_AGENT_MD = `# AI Tutor Instructions

You are a helpful, knowledgeable AI tutor for EduNex LMS. Your role is to:

1. **Help students understand course material** - Explain concepts clearly and provide examples
2. **Answer questions** - Respond to student questions about their courses, assignments, and topics
3. **Guide learning** - Don't just give answers; help students think through problems
4. **Be encouraging** - Support students in their learning journey
5. **Stay focused** - Keep discussions relevant to academic topics and course content

## Guidelines
- Use clear, simple language appropriate for the student's level
- Break down complex topics into manageable parts
- Provide examples and analogies when helpful
- Ask clarifying questions if the student's question is unclear
- Encourage critical thinking rather than just providing direct answers
- Be patient and supportive

## Limitations
- You cannot access external websites or real-time information
- You cannot modify course content or grades
- You should redirect administrative questions to course instructors
`

async function getOrCreateTutor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Tables<'student_tutors'> | null> {
  // First try to get existing tutor
  const { data: existingTutor } = await supabase
    .from('student_tutors')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existingTutor) {
    return existingTutor
  }

  // Get user's institution membership to create tutor
  const { data: membership } = await supabase
    .from('institution_members')
    .select('institution_id')
    .eq('user_id', userId)
    .single()

  if (!membership) {
    return null
  }

  // Create new tutor record
  const agentMdPath = `tutors/${userId}/agent.md`
  const { data: newTutor, error } = await supabase
    .from('student_tutors')
    .insert({
      user_id: userId,
      institution_id: membership.institution_id,
      agent_md_path: agentMdPath,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tutor:', error)
    return null
  }

  return newTutor
}

async function getAgentInstructions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentMdPath: string
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('tutor-agents')
      .download(agentMdPath)

    if (error || !data) {
      return DEFAULT_AGENT_MD
    }

    const text = await data.text()
    return text || DEFAULT_AGENT_MD
  } catch {
    return DEFAULT_AGENT_MD
  }
}

async function getEnrolledCourses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Tables<'courses'>[]> {
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      course_id,
      courses (*)
    `)
    .eq('user_id', userId)

  if (!enrollments) {
    return []
  }

  return enrollments
    .map((e) => e.courses as Tables<'courses'>)
    .filter(Boolean)
}

async function getRecentMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tutorId: string,
  limit: number = 20
): Promise<ChatMessage[]> {
  const { data: messages } = await supabase
    .from('tutor_messages')
    .select('role, content')
    .eq('tutor_id', tutorId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (!messages) {
    return []
  }

  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
}

async function saveMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  message: TablesInsert<'tutor_messages'>
): Promise<void> {
  const { error } = await supabase.from('tutor_messages').insert(message)

  if (error) {
    console.error('Error saving message:', error)
  }
}

async function searchCourseMaterials(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  query: string
): Promise<string> {
  try {
    // Get the published version ID
    const { data: course } = await supabase
      .from('courses')
      .select('published_version_id')
      .eq('id', courseId)
      .single()

    if (!course?.published_version_id) {
      return ''
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    // Search using pgvector
    const { data: results, error } = await supabase.rpc('search_course_materials', {
      query_embedding: JSON.stringify(queryEmbedding),
      p_course_id: courseId,
      p_version_id: course.published_version_id,
      match_threshold: 0.65,
      match_count: 3,
    })

    if (error || !results || results.length === 0) {
      return ''
    }

    return formatSearchResults(results)
  } catch (error) {
    console.error('Error searching course materials:', error)
    return ''
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { message, courseId } = body

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    )
  }

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not configured')
    return NextResponse.json(
      { error: 'AI service not configured' },
      { status: 500 }
    )
  }

  // Get or create tutor record
  const tutor = await getOrCreateTutor(supabase, user.id)
  if (!tutor) {
    return NextResponse.json(
      { error: 'Could not initialize tutor. Please ensure you are a member of an institution.' },
      { status: 400 }
    )
  }

  // Load agent instructions
  const agentInstructions = await getAgentInstructions(
    supabase,
    tutor.agent_md_path
  )

  // Get enrolled courses for context
  const courses = await getEnrolledCourses(supabase, user.id)
  const courseContext =
    courses.length > 0
      ? `\n\n## Student's Enrolled Courses\n${courses
          .map((c) => `- ${c.name} (${c.code}): ${c.description || 'No description'}`)
          .join('\n')}`
      : ''

  // Get selected course context if specified
  let selectedCourseContext = ''
  let relevantMaterials = ''

  if (courseId) {
    const selectedCourse = courses.find((c) => c.id === courseId)
    if (selectedCourse) {
      selectedCourseContext = `\n\n## Current Course Focus\nThe student is currently asking about: ${selectedCourse.name} (${selectedCourse.code})`

      // Search for relevant course materials using RAG
      const searchResults = await searchCourseMaterials(supabase, courseId, message.trim())
      if (searchResults) {
        relevantMaterials = `\n\n## Relevant Course Materials\nUse the following excerpts from the course materials to help answer the student's question:\n\n${searchResults}`
      }
    }
  }

  // Build system message
  const systemMessage = `${agentInstructions}${courseContext}${selectedCourseContext}${relevantMaterials}`

  // Get conversation history
  const history = await getRecentMessages(supabase, tutor.id)

  // Build messages array for the API
  const messages: ChatMessage[] = [
    { role: 'system', content: systemMessage },
    ...history,
    { role: 'user', content: message.trim() },
  ]

  // Save user message to database
  await saveMessage(supabase, {
    tutor_id: tutor.id,
    role: 'user',
    content: message.trim(),
    course_id: courseId || null,
  })

  // Create streaming response
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ''

      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'EduNex LMS AI Tutor',
          },
          body: JSON.stringify({
            model: MODEL,
            messages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.7,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('OpenRouter API error:', response.status, errorText)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'AI service error' })}\n\n`
            )
          )
          controller.close()
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'No response stream' })}\n\n`
            )
          )
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || trimmedLine === 'data: [DONE]') {
              continue
            }

            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonStr = trimmedLine.slice(6)
                const parsed = JSON.parse(jsonStr)
                const content = parsed.choices?.[0]?.delta?.content

                if (content) {
                  fullResponse += content
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content })}\n\n`
                    )
                  )
                }
              } catch (parseError) {
                // Skip malformed JSON chunks
                console.error('Error parsing chunk:', parseError)
              }
            }
          }
        }

        // Save assistant message to database
        if (fullResponse) {
          await saveMessage(supabase, {
            tutor_id: tutor.id,
            role: 'assistant',
            content: fullResponse,
            course_id: courseId || null,
          })
        }

        // Send done signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        console.error('Stream error:', error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
