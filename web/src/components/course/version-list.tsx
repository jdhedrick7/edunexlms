'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CheckCircleIcon,
  XCircleIcon,
  SendIcon,
  ArchiveIcon,
  RocketIcon,
  Loader2Icon,
  FileTextIcon,
  ClockIcon,
  UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'

interface Version {
  id: string
  version_number: number
  storage_path: string
  status: 'draft' | 'review' | 'approved' | 'archived'
  notes: string | null
  created_at: string
  approved_at: string | null
  created_by_user: { full_name: string | null; email: string } | null
  approved_by_user: { full_name: string | null; email: string } | null
}

interface VersionListProps {
  courseId: string
  versions: Version[]
  publishedVersionId: string | null
  institutionId: string
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const, icon: FileTextIcon },
  review: { label: 'In Review', variant: 'default' as const, icon: ClockIcon },
  approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircleIcon },
  archived: { label: 'Archived', variant: 'outline' as const, icon: ArchiveIcon },
}

export function VersionList({
  courseId,
  versions,
  publishedVersionId,
  institutionId,
}: VersionListProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; versionId: string | null }>({
    open: false,
    versionId: null,
  })
  const [rejectNotes, setRejectNotes] = useState('')
  const [publishDialog, setPublishDialog] = useState<{ open: boolean; versionId: string | null }>({
    open: false,
    versionId: null,
  })

  const handleAction = async (versionId: string, action: string, notes?: string) => {
    setIsLoading(versionId)
    try {
      const response = await fetch(`/api/courses/${courseId}/versions/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Action failed')
      }

      toast.success(
        action === 'submit_review'
          ? 'Submitted for review'
          : action === 'approve'
          ? 'Version approved'
          : action === 'reject'
          ? 'Version rejected'
          : 'Version archived'
      )
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setIsLoading(null)
    }
  }

  const handlePublish = async (versionId: string) => {
    setIsLoading(versionId)
    try {
      const response = await fetch(`/api/courses/${courseId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Publish failed')
      }

      toast.success('Version published successfully')
      setPublishDialog({ open: false, versionId: null })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publish failed')
    } finally {
      setIsLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectDialog.versionId) return
    await handleAction(rejectDialog.versionId, 'reject', rejectNotes)
    setRejectDialog({ open: false, versionId: null })
    setRejectNotes('')
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No versions yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first course version to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {versions.map((version) => {
          const config = statusConfig[version.status]
          const StatusIcon = config.icon
          const isPublished = version.id === publishedVersionId
          const isCurrentLoading = isLoading === version.id

          return (
            <Card key={version.id} className={isPublished ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Version {version.version_number}
                      {isPublished && (
                        <Badge variant="default" className="bg-green-600">
                          <RocketIcon className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Created {new Date(version.created_at).toLocaleDateString()}
                      {version.created_by_user && (
                        <span className="ml-2">
                          by {version.created_by_user.full_name || version.created_by_user.email}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant={config.variant}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {version.notes && (
                  <p className="text-sm text-muted-foreground mb-4">{version.notes}</p>
                )}

                {version.approved_at && version.approved_by_user && (
                  <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    Approved by {version.approved_by_user.full_name || version.approved_by_user.email}{' '}
                    on {new Date(version.approved_at).toLocaleDateString()}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {/* Draft actions */}
                  {version.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleAction(version.id, 'submit_review')}
                      disabled={isCurrentLoading}
                    >
                      {isCurrentLoading ? (
                        <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <SendIcon className="h-4 w-4 mr-2" />
                      )}
                      Submit for Review
                    </Button>
                  )}

                  {/* Review actions */}
                  {version.status === 'review' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAction(version.id, 'approve')}
                        disabled={isCurrentLoading}
                      >
                        {isCurrentLoading ? (
                          <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectDialog({ open: true, versionId: version.id })}
                        disabled={isCurrentLoading}
                      >
                        <XCircleIcon className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}

                  {/* Approved actions */}
                  {version.status === 'approved' && !isPublished && (
                    <Button
                      size="sm"
                      onClick={() => setPublishDialog({ open: true, versionId: version.id })}
                      disabled={isCurrentLoading}
                    >
                      {isCurrentLoading ? (
                        <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RocketIcon className="h-4 w-4 mr-2" />
                      )}
                      Publish
                    </Button>
                  )}

                  {/* Archive (for non-published, non-archived versions) */}
                  {version.status !== 'archived' && !isPublished && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(version.id, 'archive')}
                      disabled={isCurrentLoading}
                    >
                      <ArchiveIcon className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, versionId: open ? rejectDialog.versionId : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Version</DialogTitle>
            <DialogDescription>
              Provide feedback on why this version is being rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-notes">Rejection Notes</Label>
              <Textarea
                id="reject-notes"
                placeholder="Enter feedback for the version creator..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, versionId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isLoading !== null}>
              {isLoading ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={publishDialog.open} onOpenChange={(open) => setPublishDialog({ open, versionId: open ? publishDialog.versionId : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Version</DialogTitle>
            <DialogDescription>
              Publishing this version will make it visible to all students. The current published version will be archived.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialog({ open: false, versionId: null })}>
              Cancel
            </Button>
            <Button onClick={() => publishDialog.versionId && handlePublish(publishDialog.versionId)} disabled={isLoading !== null}>
              {isLoading ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <RocketIcon className="h-4 w-4 mr-2" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
