import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/csv',
  'application/json',
  'text/x-python',
  'text/javascript',
  'text/html',
  'text/css',
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const courseId = formData.get('courseId') as string
    const assignmentPath = formData.get('assignmentPath') as string
    const files = formData.getAll('files') as File[]

    if (!courseId || !assignmentPath) {
      return NextResponse.json(
        { error: 'courseId and assignmentPath are required' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('role')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .single()

    if (!enrollment || enrollment.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can upload submission files' },
        { status: 403 }
      )
    }

    // Get institution ID for the bucket
    const { data: course } = await supabase
      .from('courses')
      .select('institution_id')
      .eq('id', courseId)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const bucketId = `inst-${course.institution_id}`
    const storagePath = `courses/${courseId}/submissions/${user.id}/${assignmentPath.replace(/\//g, '_')}`

    const uploadedFiles: { name: string; path: string; size: number; type: string }[] = []

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400 }
        )
      }

      // Validate file type (allow common types)
      const isAllowedType = ALLOWED_TYPES.includes(file.type) ||
        file.name.endsWith('.py') ||
        file.name.endsWith('.js') ||
        file.name.endsWith('.ts') ||
        file.name.endsWith('.java') ||
        file.name.endsWith('.cpp') ||
        file.name.endsWith('.c') ||
        file.name.endsWith('.h') ||
        file.name.endsWith('.md')

      if (!isAllowedType) {
        return NextResponse.json(
          { error: `File type not allowed: ${file.type || file.name}` },
          { status: 400 }
        )
      }

      // Generate unique filename to prevent overwrites
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${storagePath}/${timestamp}_${safeName}`

      // Upload file
      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from(bucketId)
        .upload(filePath, arrayBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json(
          { error: `Failed to upload ${file.name}: ${uploadError.message}` },
          { status: 500 }
        )
      }

      uploadedFiles.push({
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type || 'application/octet-stream'
      })
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}

// GET: Download a submission file
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  const filePath = searchParams.get('filePath')

  if (!courseId || !filePath) {
    return NextResponse.json(
      { error: 'courseId and filePath are required' },
      { status: 400 }
    )
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

  // Students can only download their own files
  if (enrollment.role === 'student' && !filePath.includes(`/${user.id}/`)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get institution ID for the bucket
  const { data: course } = await supabase
    .from('courses')
    .select('institution_id')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const bucketId = `inst-${course.institution_id}`

  // Create signed URL for download
  const { data, error } = await supabase.storage
    .from(bucketId)
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error || !data) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
