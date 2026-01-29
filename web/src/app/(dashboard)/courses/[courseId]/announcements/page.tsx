'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AnnouncementCard } from '@/components/announcements/announcement-card'
import { Plus, Loader2, ArrowLeft, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import type { Announcement, User } from '@/types/database'

interface AnnouncementWithAuthor extends Announcement {
  author: User | null
  is_read?: boolean
}

interface AnnouncementsResponse {
  announcements: AnnouncementWithAuthor[]
  total: number
  limit: number
  offset: number
  isStaff: boolean
}

export default function AnnouncementsPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([])
  const [isStaff, setIsStaff] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/announcements?course_id=${courseId}`)
      const data: AnnouncementsResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.announcements ? 'Failed to fetch' : (data as unknown as { error: string }).error)
      }

      setAnnouncements(data.announcements)
      setIsStaff(data.isStaff)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements')
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  async function handleMarkAsRead(announcementId: string) {
    try {
      const response = await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      // Update local state
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId ? { ...a, is_read: true } : a
        )
      )

      toast.success('Marked as read')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark as read')
    }
  }

  async function handleDelete(announcementId: string) {
    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete announcement')
      }

      // Update local state
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId))
      toast.success('Announcement deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement')
    }
  }

  // Separate pinned and unpinned announcements
  const pinnedAnnouncements = announcements.filter((a) => a.pinned)
  const unpinnedAnnouncements = announcements.filter((a) => !a.pinned)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-destructive">{error}</p>
            <Button className="mt-4" onClick={fetchAnnouncements}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/courses/${courseId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
            <p className="text-muted-foreground">
              Course updates and important information
            </p>
          </div>
        </div>
        {isStaff && (
          <Button asChild>
            <Link href={`/courses/${courseId}/announcements/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Link>
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No announcements yet</p>
            <p className="text-sm text-muted-foreground">
              {isStaff
                ? 'Create an announcement to share updates with your students.'
                : 'Check back later for updates from your instructor.'}
            </p>
            {isStaff && (
              <Button className="mt-4" asChild>
                <Link href={`/courses/${courseId}/announcements/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Announcement
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pinned announcements */}
          {pinnedAnnouncements.length > 0 && (
            <div className="space-y-4">
              {pinnedAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  courseId={courseId}
                  isRead={announcement.is_read}
                  isStaff={isStaff}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Unpinned announcements */}
          {unpinnedAnnouncements.length > 0 && (
            <div className="space-y-4">
              {pinnedAnnouncements.length > 0 && (
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Previous Announcements
                </h2>
              )}
              {unpinnedAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  courseId={courseId}
                  isRead={announcement.is_read}
                  isStaff={isStaff}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
