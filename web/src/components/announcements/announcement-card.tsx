'use client'

import { formatDistanceToNow } from '@/lib/date-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pin, Clock, Eye, Trash2, Pencil } from 'lucide-react'
import Link from 'next/link'
import type { Announcement, User } from '@/types/database'

interface AnnouncementCardProps {
  announcement: Announcement & {
    author: User | null
  }
  courseId: string
  isRead?: boolean
  isStaff?: boolean
  onMarkAsRead?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function AnnouncementCard({
  announcement,
  courseId,
  isRead = false,
  isStaff = false,
  onMarkAsRead,
  onDelete,
}: AnnouncementCardProps) {
  const isScheduled = announcement.publish_at && new Date(announcement.publish_at) > new Date()
  const publishDate = announcement.publish_at ? new Date(announcement.publish_at) : null

  async function handleMarkAsRead() {
    if (onMarkAsRead && !isRead) {
      await onMarkAsRead(announcement.id)
    }
  }

  async function handleDelete() {
    if (onDelete && window.confirm('Are you sure you want to delete this announcement?')) {
      await onDelete(announcement.id)
    }
  }

  return (
    <Card className={!isRead && !isStaff ? 'border-primary/50 bg-primary/5' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
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
              {!isRead && !isStaff && (
                <Badge>New</Badge>
              )}
            </div>
            <Link href={`/courses/${courseId}/announcements/${announcement.id}`}>
              <CardTitle className="text-lg hover:underline cursor-pointer line-clamp-2">
                {announcement.title}
              </CardTitle>
            </Link>
          </div>
          {isStaff && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                asChild
              >
                <Link href={`/courses/${courseId}/announcements/${announcement.id}?edit=true`}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {announcement.content}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            <span>By {announcement.author?.full_name || 'Unknown'}</span>
            {publishDate && (
              <span className="ml-2">
                {isScheduled
                  ? `Scheduled for ${publishDate.toLocaleDateString()} at ${publishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : formatDistanceToNow(publishDate)
                }
              </span>
            )}
          </div>
          {!isRead && !isStaff && onMarkAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAsRead}
              className="gap-1"
            >
              <Eye className="h-3 w-3" />
              Mark as read
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
