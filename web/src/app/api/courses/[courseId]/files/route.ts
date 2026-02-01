import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: List uploaded files for a course
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

  // Check if staff member
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || (enrollment.role !== 'teacher' && enrollment.role !== 'ta')) {
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
  const filesPath = `courses/${courseId}/uploads`

  const adminClient = createAdminClient()

  const { data: files, error } = await adminClient.storage
    .from(bucketId)
    .list(filesPath, { limit: 500 })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get public URLs
  const filesWithUrls = files?.map(file => ({
    name: file.name,
    size: file.metadata?.size,
    type: file.metadata?.mimetype,
    path: `${filesPath}/${file.name}`,
    createdAt: file.created_at,
    url: adminClient.storage.from(bucketId).getPublicUrl(`${filesPath}/${file.name}`).data.publicUrl,
  })) || []

  return NextResponse.json({ files: filesWithUrls })
}

// POST: Upload files
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

  const formData = await request.formData()
  const files = formData.getAll('files') as File[]

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const bucketId = `inst-${course.institution_id}`
  const uploadsPath = `courses/${courseId}/uploads`

  const adminClient = createAdminClient()

  // Ensure bucket exists
  const { data: buckets } = await adminClient.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === bucketId)

  if (!bucketExists) {
    const { error: bucketError } = await adminClient.storage.createBucket(bucketId, {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'application/json', 'text/plain', 'text/markdown',
        'application/zip', 'video/mp4', 'audio/mpeg',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
    })

    if (bucketError) {
      return NextResponse.json({ error: 'Failed to initialize storage' }, { status: 500 })
    }
  }

  const uploadedFiles: { name: string; path: string; size: number }[] = []
  const errors: string[] = []

  for (const file of files) {
    try {
      // Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const timestamp = Date.now()
      const uniqueName = `${timestamp}-${safeName}`
      const filePath = `${uploadsPath}/${uniqueName}`

      const arrayBuffer = await file.arrayBuffer()

      const { error: uploadError } = await adminClient.storage
        .from(bucketId)
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        errors.push(`${file.name}: ${uploadError.message}`)
      } else {
        uploadedFiles.push({
          name: file.name,
          path: filePath,
          size: file.size,
        })
      }
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (uploadedFiles.length === 0) {
    return NextResponse.json(
      { error: 'No files were uploaded', errors },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    uploadedCount: uploadedFiles.length,
    files: uploadedFiles,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// DELETE: Delete a file
export async function DELETE(
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

  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ error: 'File path required' }, { status: 400 })
  }

  // Verify path is within course uploads
  if (!filePath.startsWith(`courses/${courseId}/uploads/`)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  const bucketId = `inst-${course.institution_id}`
  const adminClient = createAdminClient()

  const { error } = await adminClient.storage
    .from(bucketId)
    .remove([filePath])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
