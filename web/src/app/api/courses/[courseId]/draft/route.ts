import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Load draft modules from database
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

  // Check if teacher/TA (RLS also enforces this)
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || (enrollment.role !== 'teacher' && enrollment.role !== 'ta')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: draft } = await supabase
    .from('course_drafts')
    .select('modules, updated_at')
    .eq('course_id', courseId)
    .single()

  if (!draft) {
    return NextResponse.json({ modules: [] })
  }

  return NextResponse.json({ modules: draft.modules, updatedAt: draft.updated_at })
}

// POST: Save draft modules to database
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

  // Check if teacher (RLS also enforces this)
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const modules = body.modules || []

  const { error } = await supabase
    .from('course_drafts')
    .upsert({
      course_id: courseId,
      modules,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
