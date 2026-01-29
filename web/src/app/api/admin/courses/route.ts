import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's institution membership to verify admin role
  const { data: membership, error: membershipError } = await supabase
    .from('institution_members')
    .select('institution_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const institutionId = membership.institution_id

  // Parse query params for pagination
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = (page - 1) * limit

  // Get courses with enrollment counts
  const { data: courses, error, count } = await supabase
    .from('courses')
    .select(`
      *,
      enrollments(
        id,
        role,
        user:users(id, full_name, email)
      )
    `, { count: 'exact' })
    .eq('institution_id', institutionId)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform data to include teacher info and student count
  const coursesWithStats = courses?.map(course => {
    const teachers = course.enrollments?.filter(e => e.role === 'teacher') || []
    const studentCount = course.enrollments?.filter(e => e.role === 'student').length || 0
    const taCount = course.enrollments?.filter(e => e.role === 'ta').length || 0

    return {
      ...course,
      teachers: teachers.map(t => t.user),
      studentCount,
      taCount,
      enrollments: undefined, // Remove raw enrollments from response
    }
  })

  return NextResponse.json({
    courses: coursesWithStats,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's institution membership to verify admin role
  const { data: membership, error: membershipError } = await supabase
    .from('institution_members')
    .select('institution_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const institutionId = membership.institution_id

  let body: { code?: string; name?: string; description?: string; teacherId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate input
  if (!body.code || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const code = body.code.trim().toUpperCase()
  if (code.length < 2 || code.length > 20) {
    return NextResponse.json({ error: 'code must be between 2 and 20 characters' }, { status: 400 })
  }

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const name = body.name.trim()
  if (name.length < 2 || name.length > 255) {
    return NextResponse.json({ error: 'name must be between 2 and 255 characters' }, { status: 400 })
  }

  const description = body.description?.trim() || null

  // Check for duplicate course code in this institution
  const { data: existingCourse } = await supabase
    .from('courses')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('code', code)
    .single()

  if (existingCourse) {
    return NextResponse.json({ error: 'A course with this code already exists' }, { status: 409 })
  }

  // Create the course
  const { data: course, error: createError } = await supabase
    .from('courses')
    .insert({
      institution_id: institutionId,
      code,
      name,
      description,
    })
    .select()
    .single()

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  // If a teacher ID is provided, enroll them
  if (body.teacherId) {
    // Verify the teacher is a member of the institution
    const { data: teacherMembership } = await supabase
      .from('institution_members')
      .select('id')
      .eq('user_id', body.teacherId)
      .eq('institution_id', institutionId)
      .single()

    if (teacherMembership) {
      await supabase
        .from('enrollments')
        .insert({
          user_id: body.teacherId,
          course_id: course.id,
          role: 'teacher',
        })
    }
  }

  // Fetch the course with enrollments
  const { data: courseWithEnrollments } = await supabase
    .from('courses')
    .select(`
      *,
      enrollments(
        id,
        role,
        user:users(id, full_name, email)
      )
    `)
    .eq('id', course.id)
    .single()

  const teachers = courseWithEnrollments?.enrollments?.filter(e => e.role === 'teacher') || []

  return NextResponse.json({
    ...courseWithEnrollments,
    teachers: teachers.map(t => t.user),
    studentCount: 0,
    taCount: 0,
    enrollments: undefined,
  }, { status: 201 })
}
