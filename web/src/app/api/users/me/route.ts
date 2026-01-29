import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select(`
      *,
      institution_members(
        *,
        institution:institutions(*)
      )
    `)
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(profile)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { full_name?: string; avatar_url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate input
  const updates: { full_name?: string; avatar_url?: string } = {}

  if (body.full_name !== undefined) {
    if (typeof body.full_name !== 'string') {
      return NextResponse.json({ error: 'full_name must be a string' }, { status: 400 })
    }
    const trimmedName = body.full_name.trim()
    if (trimmedName.length === 0) {
      return NextResponse.json({ error: 'full_name cannot be empty' }, { status: 400 })
    }
    if (trimmedName.length > 255) {
      return NextResponse.json({ error: 'full_name is too long' }, { status: 400 })
    }
    updates.full_name = trimmedName
  }

  if (body.avatar_url !== undefined) {
    if (body.avatar_url !== null && typeof body.avatar_url !== 'string') {
      return NextResponse.json({ error: 'avatar_url must be a string or null' }, { status: 400 })
    }
    if (body.avatar_url && body.avatar_url.length > 2048) {
      return NextResponse.json({ error: 'avatar_url is too long' }, { status: 400 })
    }
    updates.avatar_url = body.avatar_url
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: profile, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(profile)
}
