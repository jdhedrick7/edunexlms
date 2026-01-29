import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding, formatSearchResults } from '@/lib/embeddings'

// POST: Search course materials using semantic search
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

  const body = await request.json()
  const { query, versionId, threshold = 0.7, limit = 5 } = body

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query)

    // If no versionId specified, get the published version
    let searchVersionId = versionId
    if (!searchVersionId) {
      const { data: course } = await supabase
        .from('courses')
        .select('published_version_id')
        .eq('id', courseId)
        .single()

      searchVersionId = course?.published_version_id
    }

    if (!searchVersionId) {
      return NextResponse.json({
        results: [],
        formatted: 'No course content has been published yet.',
      })
    }

    // Search using the pgvector function
    const { data: results, error } = await supabase.rpc('search_course_materials', {
      query_embedding: JSON.stringify(queryEmbedding),
      p_course_id: courseId,
      p_version_id: searchVersionId,
      match_threshold: threshold,
      match_count: limit,
    })

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format results for LLM context
    const formatted = formatSearchResults(results || [])

    return NextResponse.json({
      results: results || [],
      formatted,
      query,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search course materials' },
      { status: 500 }
    )
  }
}
