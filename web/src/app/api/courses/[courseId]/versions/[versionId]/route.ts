import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get version details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; versionId: string }> }
) {
  const { courseId, versionId } = await params
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

  if (!enrollment || enrollment.role === 'student') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { data: version, error } = await supabase
    .from('course_versions')
    .select(`
      *,
      created_by_user:users!course_versions_created_by_fkey(full_name, email),
      approved_by_user:users!course_versions_approved_by_fkey(full_name, email)
    `)
    .eq('id', versionId)
    .eq('course_id', courseId)
    .single()

  if (error || !version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  return NextResponse.json(version)
}

// PATCH: Update version status (submit for review, approve, reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; versionId: string }> }
) {
  const { courseId, versionId } = await params
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
    return NextResponse.json({ error: 'Only teachers can update versions' }, { status: 403 })
  }

  const body = await request.json()
  const { action, notes } = body

  // Get current version
  const { data: version } = await supabase
    .from('course_versions')
    .select('*')
    .eq('id', versionId)
    .eq('course_id', courseId)
    .single()

  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  let updateData: Record<string, unknown> = {}

  switch (action) {
    case 'submit_review':
      if (version.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft versions can be submitted for review' }, { status: 400 })
      }
      updateData = { status: 'review' }
      break

    case 'approve':
      if (version.status !== 'review') {
        return NextResponse.json({ error: 'Only versions in review can be approved' }, { status: 400 })
      }
      updateData = {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      }
      break

    case 'reject':
      if (version.status !== 'review') {
        return NextResponse.json({ error: 'Only versions in review can be rejected' }, { status: 400 })
      }
      updateData = { status: 'draft', notes: notes || version.notes }
      break

    case 'archive':
      updateData = { status: 'archived' }
      break

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: updatedVersion, error } = await supabase
    .from('course_versions')
    .update(updateData)
    .eq('id', versionId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedVersion)
}
