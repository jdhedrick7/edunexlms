import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

interface UploadMetadata {
  notes?: string
  sourceVersionId?: string
  prompt?: string
}

// POST: Upload a ZIP file to create a new course version
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
    return NextResponse.json({ error: 'Only teachers can upload course content' }, { status: 403 })
  }

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('id, institution_id')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadataStr = formData.get('metadata') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'File must be a ZIP archive' }, { status: 400 })
    }

    const metadata: UploadMetadata = metadataStr ? JSON.parse(metadataStr) : {}

    // Read the ZIP file
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Validate ZIP contents
    const files = Object.keys(zip.files)
    if (files.length === 0) {
      return NextResponse.json({ error: 'ZIP file is empty' }, { status: 400 })
    }

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
    const bucketId = `inst-${course.institution_id}`

    const adminClient = createAdminClient()
    const uploadErrors: string[] = []
    let uploadedCount = 0

    // Upload each file from the ZIP
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      // Skip directories and metadata file
      if (zipEntry.dir || relativePath === '_metadata.json') {
        continue
      }

      // Skip hidden files and system files
      if (relativePath.startsWith('.') || relativePath.includes('/__MACOSX/')) {
        continue
      }

      try {
        const content = await zipEntry.async('arraybuffer')
        const fullPath = `${storagePath}/${relativePath}`

        // Determine content type
        let contentType = 'application/octet-stream'
        if (relativePath.endsWith('.json')) contentType = 'application/json'
        else if (relativePath.endsWith('.md')) contentType = 'text/markdown'
        else if (relativePath.endsWith('.txt')) contentType = 'text/plain'
        else if (relativePath.endsWith('.png')) contentType = 'image/png'
        else if (relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg')) contentType = 'image/jpeg'
        else if (relativePath.endsWith('.gif')) contentType = 'image/gif'
        else if (relativePath.endsWith('.pdf')) contentType = 'application/pdf'

        const { error: uploadError } = await adminClient.storage
          .from(bucketId)
          .upload(fullPath, content, {
            contentType,
            upsert: true,
          })

        if (uploadError) {
          uploadErrors.push(`Failed to upload ${relativePath}: ${uploadError.message}`)
        } else {
          uploadedCount++
        }
      } catch (err) {
        uploadErrors.push(`Error processing ${relativePath}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    if (uploadedCount === 0) {
      return NextResponse.json(
        { error: 'No files were uploaded successfully', errors: uploadErrors },
        { status: 500 }
      )
    }

    // Create the version record
    const { data: newVersion, error: versionError } = await supabase
      .from('course_versions')
      .insert({
        id: versionId,
        course_id: courseId,
        version_number: newVersionNumber,
        storage_path: storagePath,
        status: 'draft',
        notes: metadata.notes || `Uploaded from ZIP (${file.name})`,
        created_by: user.id,
      })
      .select()
      .single()

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 500 })
    }

    // If this was from an AI edit job, update the job
    if (metadata.sourceVersionId) {
      await supabase
        .from('course_edit_jobs')
        .update({
          result_version_id: versionId,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('source_version_id', metadata.sourceVersionId)
        .eq('status', 'processing')
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      uploadedFiles: uploadedCount,
      errors: uploadErrors.length > 0 ? uploadErrors : undefined,
    }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}
