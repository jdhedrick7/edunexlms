'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { formatDateForInput } from '@/lib/date-utils'
import type { Announcement } from '@/types/database'
import { Loader2 } from 'lucide-react'

const announcementSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be less than 10,000 characters'),
  pinned: z.boolean(),
  publish_at: z.string().optional(),
})

type AnnouncementFormData = z.infer<typeof announcementSchema>

interface AnnouncementFormProps {
  courseId: string
  announcement?: Announcement
  mode: 'create' | 'edit'
}

export function AnnouncementForm({
  courseId,
  announcement,
  mode,
}: AnnouncementFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [schedulePublish, setSchedulePublish] = useState(
    mode === 'edit' && announcement?.publish_at
      ? new Date(announcement.publish_at) > new Date()
      : false
  )

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: announcement?.title || '',
      content: announcement?.content || '',
      pinned: announcement?.pinned || false,
      publish_at: announcement?.publish_at
        ? formatDateForInput(announcement.publish_at)
        : '',
    },
  })

  async function onSubmit(data: AnnouncementFormData) {
    setIsSubmitting(true)

    try {
      const url =
        mode === 'create'
          ? '/api/announcements'
          : `/api/announcements/${announcement?.id}`

      const method = mode === 'create' ? 'POST' : 'PATCH'

      const body = {
        ...data,
        course_id: courseId,
        publish_at: schedulePublish && data.publish_at
          ? new Date(data.publish_at).toISOString()
          : new Date().toISOString(),
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save announcement')
      }

      toast.success(
        mode === 'create'
          ? 'Announcement created successfully'
          : 'Announcement updated successfully'
      )

      router.push(`/courses/${courseId}/announcements`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save announcement'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create Announcement' : 'Edit Announcement'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter announcement title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter announcement content (Markdown supported)"
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    You can use Markdown for formatting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pinned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Pin Announcement</FormLabel>
                    <FormDescription>
                      Pinned announcements appear at the top of the list
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Schedule Publication</Label>
                <p className="text-sm text-muted-foreground">
                  Publish at a specific date and time
                </p>
              </div>
              <Switch
                checked={schedulePublish}
                onCheckedChange={setSchedulePublish}
              />
            </div>

            {schedulePublish && (
              <FormField
                control={form.control}
                name="publish_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publish Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        min={formatDateForInput(new Date())}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The announcement will be visible to students after this time
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mode === 'create' ? 'Create Announcement' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
