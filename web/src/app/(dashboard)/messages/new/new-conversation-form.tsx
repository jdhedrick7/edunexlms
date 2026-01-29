'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

interface Course {
  id: string
  name: string
  code: string
  institutionName: string
  role: string
}

interface NewConversationFormProps {
  courses: Course[]
  currentUserId: string
}

type UserWithEnrollment = Tables<'users'> & {
  enrollment_role: string
}

export function NewConversationForm({ courses, currentUserId }: NewConversationFormProps) {
  const router = useRouter()
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [users, setUsers] = useState<UserWithEnrollment[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load users when course changes
  useEffect(() => {
    if (!selectedCourse) {
      setUsers([])
      setSelectedUsers([])
      return
    }

    const loadUsers = async () => {
      setIsLoadingUsers(true)
      setError(null)

      try {
        const supabase = createClient()

        // Get all enrollments for the selected course (excluding current user)
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select(`
            user_id,
            role,
            user:users(*)
          `)
          .eq('course_id', selectedCourse)
          .neq('user_id', currentUserId)

        if (enrollError) throw enrollError

        const usersWithRoles: UserWithEnrollment[] = (enrollments || [])
          .filter(e => e.user)
          .map(e => ({
            ...e.user!,
            enrollment_role: e.role
          }))

        // Sort: teachers first, then TAs, then students, then alphabetically
        usersWithRoles.sort((a, b) => {
          const roleOrder: Record<string, number> = { teacher: 0, ta: 1, student: 2 }
          const aOrder = roleOrder[a.enrollment_role] ?? 3
          const bOrder = roleOrder[b.enrollment_role] ?? 3
          if (aOrder !== bOrder) return aOrder - bOrder
          return (a.full_name || '').localeCompare(b.full_name || '')
        })

        setUsers(usersWithRoles)
      } catch {
        setError('Failed to load course members')
      } finally {
        setIsLoadingUsers(false)
      }
    }

    loadUsers()
  }, [selectedCourse, currentUserId])

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  })

  const toggleUser = useCallback((userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCourse || selectedUsers.length === 0 || !message.trim()) {
      setError('Please select a course, at least one recipient, and write a message')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course_id: selectedCourse,
          recipient_ids: selectedUsers,
          initial_message: message.trim(),
          type: selectedUsers.length > 1 ? 'group' : 'direct'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create conversation')
      }

      const { conversation_id } = await response.json()
      router.push(`/messages/${conversation_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setIsSubmitting(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      teacher: 'bg-primary/10 text-primary',
      ta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      student: 'bg-muted text-muted-foreground'
    }
    const roleLabels: Record<string, string> = {
      teacher: 'Teacher',
      ta: 'TA',
      student: 'Student'
    }
    return (
      <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', roleColors[role] || roleColors.student)}>
        {roleLabels[role] || role}
      </span>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Course Selection */}
      <div className="space-y-2">
        <Label htmlFor="course">Course</Label>
        <select
          id="course"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          disabled={isSubmitting}
        >
          <option value="">Select a course...</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* Recipient Selection */}
      {selectedCourse && (
        <div className="space-y-2">
          <Label>Recipients</Label>
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="mt-2 max-h-60 overflow-y-auto rounded-md border">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <svg
                  className="h-6 w-6 animate-spin text-muted-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {users.length === 0
                  ? 'No other members in this course'
                  : 'No members match your search'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.includes(user.id)
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      disabled={isSubmitting}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50',
                        isSelected && 'bg-primary/5'
                      )}
                    >
                      <div className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input'
                      )}>
                        {isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <Avatar size="sm">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ''} />
                        <AvatarFallback>{getInitials(user.full_name || 'U')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">
                          {user.full_name || 'Unknown User'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {getRoleBadge(user.enrollment_role)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedUsers.length} recipient{selectedUsers.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {/* Message */}
      {selectedCourse && selectedUsers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
            rows={4}
            disabled={isSubmitting}
            className={cn(
              'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/messages')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!selectedCourse || selectedUsers.length === 0 || !message.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              Send Message
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
