'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { User, InstitutionMember } from '@/types/database'

type CourseWithStats = {
  id: string
  code: string
  name: string
  description: string | null
  created_at: string | null
  teachers: User[]
  studentCount: number
  taCount: number
}

type CoursesResponse = {
  courses: CourseWithStats[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type MemberWithUser = InstitutionMember & {
  user: User
}

export default function AdminCoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<CourseWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [error, setError] = useState<string | null>(null)

  // Create course form state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Teachers list for assignment
  const [teachers, setTeachers] = useState<MemberWithUser[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    })

    const response = await fetch(`/api/admin/courses?${params}`)

    if (response.status === 403) {
      router.push('/dashboard')
      return
    }

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Failed to load courses')
      setLoading(false)
      return
    }

    const data: CoursesResponse = await response.json()
    setCourses(data.courses)
    setPagination(data.pagination)
    setLoading(false)
  }, [pagination.page, pagination.limit, router])

  const loadTeachers = useCallback(async () => {
    setLoadingTeachers(true)

    const response = await fetch('/api/admin/users?role=teacher&limit=100')

    if (response.ok) {
      const data = await response.json()
      setTeachers(data.members)
    }

    setLoadingTeachers(false)
  }, [])

  useEffect(() => {
    // Check if user is admin
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

      loadCourses()
      loadTeachers()
    }

    checkAdmin()
  }, [router, loadCourses, loadTeachers])

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)

    const response = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: courseCode,
        name: courseName,
        description: courseDescription || null,
        teacherId: selectedTeacher || undefined,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setCreateError(data.error || 'Failed to create course')
    } else {
      setShowCreateDialog(false)
      setCourseCode('')
      setCourseName('')
      setCourseDescription('')
      setSelectedTeacher('')
      loadCourses()
    }

    setCreating(false)
  }

  function openCreateDialog() {
    setCreateError(null)
    setShowCreateDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Management</h1>
          <p className="text-muted-foreground">
            Create and manage courses in your institution
          </p>
        </div>
        <Button onClick={openCreateDialog}>Create Course</Button>
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

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>
            {pagination.total} total courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading courses...</p>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No courses yet.</p>
              <Button onClick={openCreateDialog}>Create Your First Course</Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>TAs</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <Badge variant="outline">{course.code}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell>
                        {course.teachers.length > 0
                          ? course.teachers.map(t => t.full_name || t.email).join(', ')
                          : <span className="text-muted-foreground">No teacher assigned</span>
                        }
                      </TableCell>
                      <TableCell>{course.studentCount}</TableCell>
                      <TableCell>{course.taCount}</TableCell>
                      <TableCell>
                        {course.created_at
                          ? new Date(course.created_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Course Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Add a new course to your institution
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCourse}>
            <div className="space-y-4 py-4">
              {createError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {createError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., CS101"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  disabled={creating}
                  required
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  A short identifier for the course (2-20 characters)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Introduction to Computer Science"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  disabled={creating}
                  required
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief course description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher">Assign Teacher (Optional)</Label>
                <Select
                  value={selectedTeacher}
                  onValueChange={setSelectedTeacher}
                  disabled={creating || loadingTeachers}
                >
                  <SelectTrigger id="teacher">
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No teacher</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.user_id} value={teacher.user_id}>
                        {teacher.user?.full_name || teacher.user?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teachers.length === 0 && !loadingTeachers && (
                  <p className="text-xs text-muted-foreground">
                    No teachers available. Add users with the teacher role first.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Course'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
