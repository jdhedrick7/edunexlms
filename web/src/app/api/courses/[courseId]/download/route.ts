import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import archiver from 'archiver'
import { PassThrough } from 'stream'

// GET: Download course content as ZIP
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const { searchParams } = new URL(request.url)
  const versionId = searchParams.get('versionId')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is teacher or TA
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || (enrollment.role !== 'teacher' && enrollment.role !== 'ta')) {
    return NextResponse.json({ error: 'Only teachers and TAs can download course content' }, { status: 403 })
  }

  // Get course and version info
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id,
      code,
      name,
      institution_id,
      published_version_id
    `)
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Determine which version to download
  let targetVersionId = versionId || course.published_version_id
  if (!targetVersionId) {
    // Get the latest version
    const { data: latestVersion } = await supabase
      .from('course_versions')
      .select('id')
      .eq('course_id', courseId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    targetVersionId = latestVersion?.id ?? null
  }

  if (!targetVersionId) {
    return NextResponse.json({ error: 'No version available to download' }, { status: 404 })
  }

  // Get version details
  const { data: version } = await supabase
    .from('course_versions')
    .select('*')
    .eq('id', targetVersionId)
    .single()

  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const bucketId = `inst-${course.institution_id}`

  try {
    // Create a PassThrough stream for the ZIP
    const passThrough = new PassThrough()

    // Create the archiver
    const archive = archiver('zip', { zlib: { level: 9 } })

    // Pipe archive to the PassThrough stream
    archive.pipe(passThrough)

    // Recursively add files from storage
    async function addDirectoryToArchive(storagePath: string, archivePath: string) {
      const { data: items } = await supabase.storage
        .from(bucketId)
        .list(storagePath, { limit: 1000 })

      if (!items) return

      for (const item of items) {
        const fullStoragePath = `${storagePath}/${item.name}`
        const fullArchivePath = archivePath ? `${archivePath}/${item.name}` : item.name

        if (item.id === null) {
          // It's a directory, recurse
          await addDirectoryToArchive(fullStoragePath, fullArchivePath)
        } else {
          // It's a file, download and add to archive
          const { data: fileData } = await supabase.storage
            .from(bucketId)
            .download(fullStoragePath)

          if (fileData) {
            const buffer = await fileData.arrayBuffer()
            archive.append(Buffer.from(buffer), { name: fullArchivePath })
          }
        }
      }
    }

    // Add all files from the version's storage path
    await addDirectoryToArchive(version.storage_path, '')

    // Add metadata file
    const metadata = {
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      versionId: version.id,
      versionNumber: version.version_number,
      downloadedAt: new Date().toISOString(),
      downloadedBy: user.id,
    }
    archive.append(JSON.stringify(metadata, null, 2), { name: '_metadata.json' })

    // Finalize the archive
    await archive.finalize()

    // Convert PassThrough to ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        passThrough.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        passThrough.on('end', () => {
          controller.close()
        })
        passThrough.on('error', (err) => {
          controller.error(err)
        })
      }
    })

    const filename = `${course.code}_v${version.version_number}.zip`

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to create download' },
      { status: 500 }
    )
  }
}
