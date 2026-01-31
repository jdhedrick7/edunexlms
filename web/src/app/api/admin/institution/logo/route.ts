import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is an admin
  const { data: membership } = await supabase
    .from('institution_members')
    .select('institution_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPEG, SVG, WebP' }, { status: 400 })
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum size is 2MB' }, { status: 400 })
  }

  // Generate file path
  const ext = file.name.split('.').pop() || 'png'
  const filePath = `${membership.institution_id}/logo.${ext}`
  const bucketName = `inst-${membership.institution_id}`

  // Check if bucket exists, create if not
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === bucketName)

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'application/pdf', 'application/json', 'text/plain', 'text/markdown', 'application/zip', 'video/mp4', 'audio/mpeg'],
    })
    if (createError) {
      return NextResponse.json({ error: 'Failed to create storage bucket' }, { status: 500 })
    }
  }

  // Upload file
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath)

  // Update institution with logo URL
  const { error: updateError } = await supabase
    .from('institutions')
    .update({ logo_url: publicUrl })
    .eq('id', membership.institution_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ logo_url: publicUrl })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is an admin
  const { data: membership } = await supabase
    .from('institution_members')
    .select('institution_id, role, institution:institutions(logo_url)')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Clear logo URL from institution
  const { error: updateError } = await supabase
    .from('institutions')
    .update({ logo_url: null })
    .eq('id', membership.institution_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
