import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get edit job details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()

  // Check for API key first (for VM harness)
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.EDIT_HARNESS_API_KEY
  const isHarness = apiKey === expectedKey

  const { data: job, error } = await supabase
    .from('course_edit_jobs')
    .select(`
      *,
      course:courses(id, code, name, institution_id),
      source_version:course_versions!course_edit_jobs_source_version_id_fkey(*),
      result_version:course_versions!course_edit_jobs_result_version_id_fkey(*)
    `)
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // If not harness, verify user is teacher
  if (!isHarness) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('role')
      .eq('course_id', job.course_id)
      .eq('user_id', user.id)
      .single()

    if (!enrollment || enrollment.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  return NextResponse.json({ job })
}

// PATCH: Update job status (for VM harness)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()

  // Verify API key for harness
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.EDIT_HARNESS_API_KEY

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 403 })
  }

  const body = await request.json()
  const { status, errorMessage, resultVersionId } = body

  const validStatuses = ['processing', 'completed', 'failed']
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Status must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = { status }

  if (status === 'processing') {
    updateData.started_at = new Date().toISOString()
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    if (resultVersionId) {
      updateData.result_version_id = resultVersionId
    }
  }

  if (status === 'failed' && errorMessage) {
    updateData.error_message = errorMessage
    updateData.completed_at = new Date().toISOString()
  }

  const { data: job, error } = await supabase
    .from('course_edit_jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create notification for the teacher when job completes or fails
  if (status === 'completed' || status === 'failed') {
    const { data: jobDetails } = await supabase
      .from('course_edit_jobs')
      .select('created_by, course_id, course:courses(name, code)')
      .eq('id', jobId)
      .single()

    if (jobDetails?.created_by) {
      await supabase.from('notifications').insert({
        user_id: jobDetails.created_by,
        course_id: jobDetails.course_id,
        type: 'edit_complete',
        title: status === 'completed'
          ? `Course edit completed`
          : `Course edit failed`,
        body: status === 'completed'
          ? `Your requested changes to ${jobDetails.course?.name || 'the course'} have been processed. Review and approve the new version.`
          : `The course edit job failed: ${errorMessage || 'Unknown error'}`,
        data: {
          jobId,
          status,
          url: `/courses/${jobDetails.course_id}/versions`,
        },
      })
    }
  }

  return NextResponse.json({ job })
}
