import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List all versions for a course
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

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) {
    return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
  }

  // Only teachers and TAs can see all versions
  if (enrollment.role === 'student') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get course with published version
  const { data: course } = await supabase
    .from('courses')
    .select('published_version_id')
    .eq('id', courseId)
    .single()

  // Get all versions
  const { data: versions, error } = await supabase
    .from('course_versions')
    .select(`
      *,
      created_by_user:users!course_versions_created_by_fkey(full_name, email),
      approved_by_user:users!course_versions_approved_by_fkey(full_name, email)
    `)
    .eq('course_id', courseId)
    .order('version_number', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    versions,
    publishedVersionId: course?.published_version_id
  })
}

// POST: Create a new version (for manual creation or AI edit result)
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

  // Check if user is a teacher
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can create versions' }, { status: 403 })
  }

  const body = await request.json()
  const { notes, status = 'draft' } = body

  // Get current max version number
  const { data: maxVersion } = await supabase
    .from('course_versions')
    .select('version_number')
    .eq('course_id', courseId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const newVersionNumber = (maxVersion?.version_number || 0) + 1
  const versionId = crypto.randomUUID()
  const storagePath = `courses/${courseId}/material/${versionId}`

  const { data: version, error } = await supabase
    .from('course_versions')
    .insert({
      id: versionId,
      course_id: courseId,
      version_number: newVersionNumber,
      storage_path: storagePath,
      status,
      notes,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(version, { status: 201 })
}
