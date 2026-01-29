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

  // Parse query params for filtering
  const searchParams = request.nextUrl.searchParams
  const role = searchParams.get('role')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = (page - 1) * limit

  // Build query
  let query = supabase
    .from('institution_members')
    .select(`
      *,
      user:users(*)
    `, { count: 'exact' })
    .eq('institution_id', institutionId)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (role && ['admin', 'teacher', 'ta', 'student'].includes(role)) {
    query = query.eq('role', role)
  }

  const { data: members, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    members,
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

  let body: { email?: string; role?: string; full_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate input
  if (!body.email || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const email = body.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  if (!body.role || !['admin', 'teacher', 'ta', 'student'].includes(body.role)) {
    return NextResponse.json({ error: 'role must be admin, teacher, ta, or student' }, { status: 400 })
  }

  // full_name is reserved for future invitation feature
  // const fullName = body.full_name?.trim() || null

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    // Check if already a member of this institution
    const { data: existingMember } = await supabase
      .from('institution_members')
      .select('id')
      .eq('user_id', existingUser.id)
      .eq('institution_id', institutionId)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this institution' }, { status: 409 })
    }

    // Add existing user to institution
    const { data: newMember, error: insertError } = await supabase
      .from('institution_members')
      .insert({
        user_id: existingUser.id,
        institution_id: institutionId,
        role: body.role,
      })
      .select(`
        *,
        user:users(*)
      `)
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(newMember, { status: 201 })
  }

  // User doesn't exist - we need to invite them
  // For now, create the user record and membership (they'll set password on first login)
  // In a real app, this would trigger an invitation email

  // Note: In Supabase, we can't directly create auth users from the client
  // This would typically require an admin API or edge function
  // For this implementation, we'll create a placeholder user record
  // and assume they'll be created when they sign up with this email

  return NextResponse.json(
    {
      error: 'User does not exist. They must sign up first, then you can add them to the institution.',
      suggestion: 'Ask the user to sign up at the application, then try adding them again.'
    },
    { status: 400 }
  )
}
