import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding, processDocumentForEmbedding } from '@/lib/embeddings'

// POST: Index course materials for a specific version
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
    return NextResponse.json({ error: 'Only teachers can index course materials' }, { status: 403 })
  }

  const body = await request.json()
  const { versionId } = body

  if (!versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 })
  }

  // Get version and course info
  const { data: version } = await supabase
    .from('course_versions')
    .select('*, course:courses(institution_id)')
    .eq('id', versionId)
    .eq('course_id', courseId)
    .single()

  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const adminClient = createAdminClient()
  const bucketId = `inst-${version.course?.institution_id}`

  try {
    // List all files in the version's storage path
    const { data: files, error: listError } = await adminClient.storage
      .from(bucketId)
      .list(version.storage_path, { limit: 1000 })

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    // Delete existing embeddings for this version
    await adminClient
      .from('course_material_embeddings')
      .delete()
      .eq('version_id', versionId)

    let indexedCount = 0
    const errors: string[] = []

    // Process each file recursively
    async function processDirectory(path: string) {
      const { data: items } = await adminClient.storage
        .from(bucketId)
        .list(path, { limit: 1000 })

      if (!items) return

      for (const item of items) {
        const fullPath = `${path}/${item.name}`

        if (item.id === null) {
          // It's a directory, recurse
          await processDirectory(fullPath)
        } else if (
          item.name.endsWith('.md') ||
          item.name.endsWith('.json')
        ) {
          // It's a text file, process it
          try {
            const { data: fileData } = await adminClient.storage
              .from(bucketId)
              .download(fullPath)

            if (fileData) {
              const content = await fileData.text()

              // Skip module.json files (metadata only)
              if (item.name === 'module.json') continue

              // For JSON files, extract relevant text content
              let textContent = content
              if (item.name.endsWith('.json')) {
                try {
                  const json = JSON.parse(content)
                  // Extract text fields from assignments/quizzes
                  const textParts: string[] = []
                  if (json.title) textParts.push(`Title: ${json.title}`)
                  if (json.instructions) textParts.push(`Instructions: ${json.instructions}`)
                  if (json.questions) {
                    json.questions.forEach((q: { question?: string }, i: number) => {
                      if (q.question) textParts.push(`Question ${i + 1}: ${q.question}`)
                    })
                  }
                  textContent = textParts.join('\n\n')
                } catch {
                  // Keep raw content if JSON parsing fails
                }
              }

              if (textContent.trim().length === 0) continue

              // Process and generate embeddings
              const { chunks, embeddings, metadata } = await processDocumentForEmbedding(
                textContent,
                { filePath: fullPath, fileName: item.name }
              )

              // Insert embeddings
              for (let i = 0; i < chunks.length; i++) {
                const { error: insertError } = await adminClient
                  .from('course_material_embeddings')
                  .insert({
                    course_id: courseId,
                    version_id: versionId,
                    file_path: fullPath,
                    chunk_index: i,
                    content: chunks[i],
                    embedding: JSON.stringify(embeddings[i]),
                    metadata: metadata[i],
                  })

                if (insertError) {
                  errors.push(`Failed to insert embedding for ${fullPath}: ${insertError.message}`)
                } else {
                  indexedCount++
                }
              }
            }
          } catch (err) {
            errors.push(`Failed to process ${fullPath}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
        }
      }
    }

    await processDirectory(version.storage_path)

    return NextResponse.json({
      success: true,
      indexedChunks: indexedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Indexing error:', error)
    return NextResponse.json(
      { error: 'Failed to index course materials' },
      { status: 500 }
    )
  }
}
