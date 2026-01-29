import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List pending edit jobs (for VM harness polling)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check for API key header (for VM harness)
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.EDIT_HARNESS_API_KEY

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'

  const { data: jobs, error } = await supabase
    .from('course_edit_jobs')
    .select(`
      *,
      course:courses(id, code, name, institution_id),
      source_version:course_versions!course_edit_jobs_source_version_id_fkey(*)
    `)
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ jobs })
}

// POST: Create a new edit job (from teacher assistant)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { courseId, prompt, scope = 'course', modulePath } = body

  if (!courseId || !prompt) {
    return NextResponse.json(
      { error: 'courseId and prompt are required' },
      { status: 400 }
    )
  }

  // Check if user is a teacher
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only teachers can create edit jobs' },
      { status: 403 }
    )
  }

  // Get the latest approved or published version as source
  const { data: course } = await supabase
    .from('courses')
    .select('published_version_id')
    .eq('id', courseId)
    .single()

  let sourceVersionId = course?.published_version_id

  if (!sourceVersionId) {
    // Get any latest version
    const { data: latestVersion } = await supabase
      .from('course_versions')
      .select('id')
      .eq('course_id', courseId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    sourceVersionId = latestVersion?.id
  }

  if (!sourceVersionId) {
    return NextResponse.json(
      { error: 'No source version available. Please create initial course content first.' },
      { status: 400 }
    )
  }

  // Create the edit job
  const { data: job, error } = await supabase
    .from('course_edit_jobs')
    .insert({
      course_id: courseId,
      source_version_id: sourceVersionId,
      prompt,
      scope,
      module_path: modulePath,
      status: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ job }, { status: 201 })
}
