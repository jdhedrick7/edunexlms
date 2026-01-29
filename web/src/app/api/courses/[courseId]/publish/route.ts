import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Publish a version (make it the active published version)
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
    return NextResponse.json({ error: 'Only teachers can publish versions' }, { status: 403 })
  }

  const body = await request.json()
  const { versionId } = body

  if (!versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 })
  }

  // Verify the version exists and is approved
  const { data: version } = await supabase
    .from('course_versions')
    .select('*')
    .eq('id', versionId)
    .eq('course_id', courseId)
    .single()

  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  if (version.status !== 'approved') {
    return NextResponse.json(
      { error: 'Only approved versions can be published' },
      { status: 400 }
    )
  }

  // Get current published version to archive it
  const { data: course } = await supabase
    .from('courses')
    .select('published_version_id')
    .eq('id', courseId)
    .single()

  // Archive the old published version if it exists
  if (course?.published_version_id && course.published_version_id !== versionId) {
    await supabase
      .from('course_versions')
      .update({ status: 'archived' })
      .eq('id', course.published_version_id)
  }

  // Update the course's published version
  const { error: updateError } = await supabase
    .from('courses')
    .update({ published_version_id: versionId })
    .eq('id', courseId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Version published successfully',
    publishedVersionId: versionId
  })
}
