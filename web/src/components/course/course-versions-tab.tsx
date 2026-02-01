'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DownloadIcon, UploadIcon, CheckIcon, Loader2Icon, GitBranchIcon } from 'lucide-react'
import { toast } from 'sonner'

interface Version {
  id: string
  version_number: number
  status: 'draft' | 'review' | 'approved' | 'archived'
  notes: string | null
  storage_path: string
  created_at: string
  created_by_user?: { full_name: string | null; email: string } | null
  approved_by_user?: { full_name: string | null; email: string } | null
}

interface CourseVersionsTabProps {
  courseId: string
  versions: Version[]
  publishedVersionId: string | null
  institutionId: string
  onVersionsChange?: () => void
}

export function CourseVersionsTab({
  courseId,
  versions: initialVersions,
  publishedVersionId: initialPublishedId,
  onVersionsChange,
}: CourseVersionsTabProps) {
  const [versions, setVersions] = useState(initialVersions)
  const [publishedVersionId, setPublishedVersionId] = useState(initialPublishedId)
  const [loading, setLoading] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const refreshVersions = useCallback(async () => {
    const response = await fetch(`/api/courses/${courseId}/versions`)
    if (response.ok) {
      const data = await response.json()
      setVersions(data.versions || [])
      setPublishedVersionId(data.publishedVersionId)
    }
  }, [courseId])

  const handlePublish = async (versionId: string) => {
    setLoading(versionId)
    try {
      const response = await fetch(`/api/courses/${courseId}/versions/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to publish')
      }

      toast.success('Version published successfully')
      await refreshVersions()
      onVersionsChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish')
    } finally {
      setLoading(null)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/courses/${courseId}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      toast.success('Course version uploaded successfully')
      await refreshVersions()
      onVersionsChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string, isPublished: boolean) => {
    if (isPublished) {
      return <Badge className="bg-green-500">Published</Badge>
    }
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'review':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Review</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Approved</Badge>
      case 'archived':
        return <Badge variant="outline">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Course Versions</h2>
        <div className="flex items-center gap-2">
          {publishedVersionId && (
            <a href={`/api/courses/${courseId}/download`} download>
              <Button variant="outline" size="sm">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download Published
              </Button>
            </a>
          )}
          <label>
            <Button variant="outline" size="sm" disabled={uploading} asChild>
              <span>
                {uploading ? (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UploadIcon className="h-4 w-4 mr-2" />
                )}
                Upload ZIP
              </span>
            </Button>
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {versions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No versions yet. Create one in the Builder tab or upload a ZIP.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => {
            const isPublished = version.id === publishedVersionId
            return (
              <Card key={version.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">Version {version.version_number}</CardTitle>
                      {getStatusBadge(version.status, isPublished)}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPublished && version.status !== 'archived' && (
                        <Button
                          size="sm"
                          onClick={() => handlePublish(version.id)}
                          disabled={loading === version.id}
                        >
                          {loading === version.id ? (
                            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckIcon className="h-4 w-4 mr-2" />
                          )}
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    Created {formatDate(version.created_at)}
                    {version.created_by_user && (
                      <> by {version.created_by_user.full_name || version.created_by_user.email}</>
                    )}
                  </CardDescription>
                </CardHeader>
                {version.notes && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{version.notes}</p>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
