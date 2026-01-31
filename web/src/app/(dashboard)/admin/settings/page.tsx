'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Institution } from '@/types/database'

export default function AdminSettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: membership } = await supabase
        .from('institution_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()

      if (!membership) {
        router.push('/dashboard')
        return
      }

      loadInstitution()
    }

    checkAdmin()
  }, [router])

  async function loadInstitution() {
    setLoading(true)
    setError(null)

    const response = await fetch('/api/admin/institution')

    if (response.status === 403) {
      router.push('/dashboard')
      return
    }

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Failed to load institution')
      setLoading(false)
      return
    }

    const data = await response.json()
    setInstitution(data.institution)
    setName(data.institution.name)
    setLoading(false)
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const response = await fetch('/api/admin/institution', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Failed to save')
    } else {
      setInstitution(data.institution)
      setSuccess('Institution name updated')
      router.refresh()
    }

    setSaving(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/admin/institution/logo', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Failed to upload logo')
    } else {
      setInstitution(prev => prev ? { ...prev, logo_url: data.logo_url } : null)
      setSuccess('Logo uploaded successfully')
      router.refresh()
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleRemoveLogo() {
    setUploading(true)
    setError(null)
    setSuccess(null)

    const response = await fetch('/api/admin/institution/logo', {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Failed to remove logo')
    } else {
      setInstitution(prev => prev ? { ...prev, logo_url: null } : null)
      setSuccess('Logo removed')
      router.refresh()
    }

    setUploading(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Institution Settings</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Institution Settings</h1>
        <p className="text-muted-foreground">
          Manage your institution&apos;s branding and settings
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600">
          {success}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setSuccess(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize how your institution appears to users. The logo or name will be displayed in the top left of the dashboard for all users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-4">
            <Label>Logo</Label>
            <div className="flex items-start gap-6">
              <div className="flex h-20 w-40 items-center justify-center rounded-md border bg-muted/50">
                {institution?.logo_url ? (
                  <Image
                    src={institution.logo_url}
                    alt={institution.name}
                    width={160}
                    height={80}
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">No logo</span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : institution?.logo_url ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {institution?.logo_url && (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                  >
                    Remove Logo
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG, JPEG, SVG, or WebP. Max 2MB. Recommended: 240x64px
                </p>
              </div>
            </div>
          </div>

          {/* Institution Name */}
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Institution Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Institution Name"
                disabled={saving}
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed if no logo is uploaded
              </p>
            </div>
            <Button type="submit" disabled={saving || name === institution?.name}>
              {saving ? 'Saving...' : 'Save Name'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
