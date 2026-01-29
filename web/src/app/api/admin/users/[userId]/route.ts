import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params
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

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate role
  if (!body.role || !['admin', 'teacher', 'ta', 'student'].includes(body.role)) {
    return NextResponse.json({ error: 'role must be admin, teacher, ta, or student' }, { status: 400 })
  }

  // Prevent self-demotion from admin (must have at least one admin)
  if (userId === user.id && body.role !== 'admin') {
    // Check if there are other admins
    const { count } = await supabase
      .from('institution_members')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role', 'admin')
      .neq('user_id', user.id)

    if (count === 0) {
      return NextResponse.json(
        { error: 'Cannot remove your own admin role. The institution must have at least one admin.' },
        { status: 400 }
      )
    }
  }

  // Find the membership to update
  const { data: targetMembership, error: findError } = await supabase
    .from('institution_members')
    .select('id')
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .single()

  if (findError || !targetMembership) {
    return NextResponse.json({ error: 'User not found in this institution' }, { status: 404 })
  }

  // Update the role
  const { data: updated, error: updateError } = await supabase
    .from('institution_members')
    .update({ role: body.role })
    .eq('id', targetMembership.id)
    .select(`
      *,
      user:users(*)
    `)
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params
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

  // Prevent self-removal
  if (userId === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself from the institution' }, { status: 400 })
  }

  // Find the membership to delete
  const { data: targetMembership, error: findError } = await supabase
    .from('institution_members')
    .select('id, role')
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .single()

  if (findError || !targetMembership) {
    return NextResponse.json({ error: 'User not found in this institution' }, { status: 404 })
  }

  // If removing an admin, ensure there's at least one other admin
  if (targetMembership.role === 'admin') {
    const { count } = await supabase
      .from('institution_members')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role', 'admin')
      .neq('user_id', userId)

    if (count === 0) {
      return NextResponse.json(
        { error: 'Cannot remove the last admin from the institution' },
        { status: 400 }
      )
    }
  }

  // Delete the membership
  const { error: deleteError } = await supabase
    .from('institution_members')
    .delete()
    .eq('id', targetMembership.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
