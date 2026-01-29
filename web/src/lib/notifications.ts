import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export type NotificationType =
  | 'grade'
  | 'submission'
  | 'announcement'
  | 'message'
  | 'edit_complete'
  | 'system'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  institutionId?: string
  courseId?: string
}

/**
 * Creates a notification for a user.
 * This function should be called from server-side code only.
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  data,
  institutionId,
  courseId,
}: CreateNotificationParams): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body || null,
    data: (data as Json) || null,
    institution_id: institutionId || null,
    course_id: courseId || null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Gets the count of unread notifications for a user.
 * This function should be called from server-side code only.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) {
    return 0
  }

  return count || 0
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Marks all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
