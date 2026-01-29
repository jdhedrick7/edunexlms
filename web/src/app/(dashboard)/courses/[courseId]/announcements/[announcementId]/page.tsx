'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnnouncementForm } from '@/components/announcements/announcement-form'
import { ArrowLeft, Loader2, Pin, Clock, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime, formatDistanceToNow } from '@/lib/date-utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Announcement, User } from '@/types/database'

interface AnnouncementWithAuthor extends Announcement {
  author: User | null
  is_read?: boolean
}

interface AnnouncementResponse {
  announcement: AnnouncementWithAuthor
  isStaff: boolean
}

export default function AnnouncementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = params.courseId as string
  const announcementId = params.announcementId as string
  const isEditMode = searchParams.get('edit') === 'true'

  const [announcement, setAnnouncement] = useState<AnnouncementWithAuthor | null>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnnouncement = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/announcements/${announcementId}`)
      const data: AnnouncementResponse = await response.json()

      if (!response.ok) {
        throw new Error((data as unknown as { error: string }).error || 'Failed to fetch announcement')
      }

      setAnnouncement(data.announcement)
      setIsStaff(data.isStaff)

      // Mark as read if not already read
      if (!data.announcement.is_read && !data.isStaff) {
        await fetch(`/api/announcements/${announcementId}/read`, {
          method: 'POST',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcement')
    } finally {
      setIsLoading(false)
    }
  }, [announcementId])

  useEffect(() => {
    fetchAnnouncement()
  }, [fetchAnnouncement])

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return
    }

    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete announcement')
      }

      toast.success('Announcement deleted')
      router.push(`/courses/${courseId}/announcements`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !announcement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/courses/${courseId}/announcements`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Announcement</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-destructive">
              {error || 'Announcement not found'}
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/courses/${courseId}/announcements`}>
                Back to Announcements
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isScheduled = announcement.publish_at && new Date(announcement.publish_at) > new Date()
  const publishDate = announcement.publish_at ? new Date(announcement.publish_at) : null

  // Show edit form if in edit mode
  if (isEditMode && isStaff) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/courses/${courseId}/announcements/${announcementId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Announcement</h1>
            <p className="text-muted-foreground">
              Update this announcement
            </p>
          </div>
        </div>

        <div className="max-w-2xl">
          <AnnouncementForm
            courseId={courseId}
            announcement={announcement}
            mode="edit"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/courses/${courseId}/announcements`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Announcement</h1>
          </div>
        </div>
        {isStaff && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/courses/${courseId}/announcements/${announcementId}?edit=true`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {announcement.pinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="h-3 w-3" />
                Pinned
              </Badge>
            )}
            {isScheduled && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Scheduled
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl">{announcement.title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span>By {announcement.author?.full_name || 'Unknown'}</span>
            {publishDate && (
              <span>
                {isScheduled
                  ? `Scheduled for ${formatDateTime(publishDate)}`
                  : formatDistanceToNow(publishDate)
                }
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {announcement.content}
            </ReactMarkdown>
          </div>
          {announcement.updated_at && announcement.updated_at !== announcement.created_at && (
            <p className="text-xs text-muted-foreground mt-6 pt-4 border-t">
              Last updated: {formatDateTime(announcement.updated_at)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
