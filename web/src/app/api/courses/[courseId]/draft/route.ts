import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Module {
  id: string
  order: number
  title: string
  description: string
  content: string
  assignment: {
    title: string
    description: string
    instructions: string
    dueInDays: number
    pointsPossible: number
    submissionType: 'text' | 'file' | 'both'
  } | null
  quiz: {
    title: string
    description: string
    timeLimit: number | null
    attemptsAllowed: number
    questions: {
      id: string
      type: 'multiple_choice' | 'true_false' | 'short_answer'
      question: string
      options?: string[]
      correctAnswer: string | number
      points: number
    }[]
  } | null
}

// GET: Load draft modules from storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if teacher
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('institution_id')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const bucketId = `inst-${course.institution_id}`
  const draftPath = `courses/${courseId}/draft.json`

  // Try to load existing draft
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage
    .from(bucketId)
    .download(draftPath)

  if (error || !data) {
    // No draft exists yet
    return NextResponse.json({ modules: [] })
  }

  try {
    const text = await data.text()
    const draft = JSON.parse(text)
    return NextResponse.json(draft)
  } catch {
    return NextResponse.json({ modules: [] })
  }
}

// POST: Save draft modules to storage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if teacher
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('institution_id')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const body = await request.json()
  const modules: Module[] = body.modules || []

  const bucketId = `inst-${course.institution_id}`
  const draftPath = `courses/${courseId}/draft.json`

  const adminClient = createAdminClient()

  // Ensure bucket exists
  const { data: buckets } = await adminClient.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === bucketId)

  if (!bucketExists) {
    await adminClient.storage.createBucket(bucketId, {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'application/json', 'text/plain', 'text/markdown',
        'application/zip', 'video/mp4', 'audio/mpeg'
      ],
    })
  }

  // Save draft
  const draftContent = JSON.stringify({ modules, updatedAt: new Date().toISOString() })

  const { error: uploadError } = await adminClient.storage
    .from(bucketId)
    .upload(draftPath, draftContent, {
      contentType: 'application/json',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
