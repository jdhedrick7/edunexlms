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

  // Assign teacher dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assigningCourse, setAssigningCourse] = useState<CourseWithStats | null>(null)
  const [assignTeacherId, setAssignTeacherId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  // Students management state
  const [students, setStudents] = useState<MemberWithUser[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [showStudentsDialog, setShowStudentsDialog] = useState(false)
  const [managingCourse, setManagingCourse] = useState<CourseWithStats | null>(null)
  const [courseStudents, setCourseStudents] = useState<User[]>([])
  const [assignStudentId, setAssignStudentId] = useState<string>('')
  const [assigningStudent, setAssigningStudent] = useState(false)
  const [studentError, setStudentError] = useState<string | null>(null)

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

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true)

    const response = await fetch('/api/admin/users?role=student&limit=500')

    if (response.ok) {
      const data = await response.json()
      setStudents(data.members)
    }

    setLoadingStudents(false)
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
      loadStudents()
    }

    checkAdmin()
  }, [router, loadCourses, loadTeachers, loadStudents])

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
        teacherId: selectedTeacher && selectedTeacher !== 'none' ? selectedTeacher : undefined,
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

  function openAssignDialog(course: CourseWithStats) {
    setAssigningCourse(course)
    setAssignTeacherId('')
    setAssignError(null)
    setShowAssignDialog(true)
  }

  async function handleAssignTeacher(e: React.FormEvent) {
    e.preventDefault()
    if (!assigningCourse || !assignTeacherId || assignTeacherId === 'none') return

    setAssigning(true)
    setAssignError(null)

    const response = await fetch(`/api/admin/courses/${assigningCourse.id}/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: assignTeacherId }),
    })

    if (!response.ok) {
      const data = await response.json()
      setAssignError(data.error || 'Failed to assign teacher')
    } else {
      setShowAssignDialog(false)
      setAssigningCourse(null)
      setAssignTeacherId('')
      loadCourses()
    }

    setAssigning(false)
  }

  async function handleRemoveTeacher(courseId: string, teacherId: string) {
    const response = await fetch(`/api/admin/courses/${courseId}/teachers?teacherId=${teacherId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      loadCourses()
    } else {
      const data = await response.json()
      setError(data.error || 'Failed to remove teacher')
    }
  }

  async function openStudentsDialog(course: CourseWithStats) {
    setManagingCourse(course)
    setAssignStudentId('')
    setStudentError(null)
    setShowStudentsDialog(true)

    // Load current students for this course
    const response = await fetch(`/api/admin/courses/${course.id}/students`)
    if (response.ok) {
      const data = await response.json()
      setCourseStudents(data.students)
    }
  }

  async function handleAssignStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!managingCourse || !assignStudentId || assignStudentId === 'none') return

    setAssigningStudent(true)
    setStudentError(null)

    const response = await fetch(`/api/admin/courses/${managingCourse.id}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: assignStudentId }),
    })

    if (!response.ok) {
      const data = await response.json()
      setStudentError(data.error || 'Failed to enroll student')
    } else {
      setAssignStudentId('')
      // Refresh course students
      const refreshResponse = await fetch(`/api/admin/courses/${managingCourse.id}/students`)
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCourseStudents(data.students)
      }
      loadCourses()
    }

    setAssigningStudent(false)
  }

  async function handleRemoveStudent(studentId: string) {
    if (!managingCourse) return

    const response = await fetch(`/api/admin/courses/${managingCourse.id}/students?studentId=${studentId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setCourseStudents(prev => prev.filter(s => s.id !== studentId))
      loadCourses()
    } else {
      const data = await response.json()
      setStudentError(data.error || 'Failed to remove student')
    }
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
                    <TableHead>Actions</TableHead>
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
                        {course.teachers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {course.teachers.map(t => (
                              <Badge key={t.id} variant="secondary" className="gap-1">
                                {t.full_name || t.email}
                                <button
                                  onClick={() => handleRemoveTeacher(course.id, t.id)}
                                  className="ml-1 hover:text-destructive"
                                  title="Remove teacher"
                                >
                                  &times;
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No teacher assigned</span>
                        )}
                      </TableCell>
                      <TableCell>{course.studentCount}</TableCell>
                      <TableCell>{course.taCount}</TableCell>
                      <TableCell>
                        {course.created_at
                          ? new Date(course.created_at).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignDialog(course)}
                          >
                            + Teacher
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openStudentsDialog(course)}
                          >
                            Manage Students
                          </Button>
                        </div>
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
                    <SelectItem value="none">No teacher</SelectItem>
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

      {/* Assign Teacher Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Teacher</DialogTitle>
            <DialogDescription>
              {assigningCourse && (
                <>Assign a teacher to <strong>{assigningCourse.code}: {assigningCourse.name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignTeacher}>
            <div className="space-y-4 py-4">
              {assignError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {assignError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="assign-teacher">Select Teacher</Label>
                <Select
                  value={assignTeacherId}
                  onValueChange={setAssignTeacherId}
                  disabled={assigning || loadingTeachers}
                >
                  <SelectTrigger id="assign-teacher">
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a teacher...</SelectItem>
                    {teachers
                      .filter(t => !assigningCourse?.teachers.some(ct => ct.id === t.user_id))
                      .map((teacher) => (
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
              <Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assigning || !assignTeacherId || assignTeacherId === 'none'}>
                {assigning ? 'Assigning...' : 'Assign Teacher'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Students Dialog */}
      <Dialog open={showStudentsDialog} onOpenChange={setShowStudentsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Students</DialogTitle>
            <DialogDescription>
              {managingCourse && (
                <>Manage students for <strong>{managingCourse.code}: {managingCourse.name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {studentError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {studentError}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  onClick={() => setStudentError(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Add Student Form */}
            <form onSubmit={handleAssignStudent} className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={assignStudentId}
                  onValueChange={setAssignStudentId}
                  disabled={assigningStudent || loadingStudents}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student to enroll" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a student...</SelectItem>
                    {students
                      .filter(s => !courseStudents.some(cs => cs.id === s.user_id))
                      .map((student) => (
                        <SelectItem key={student.user_id} value={student.user_id}>
                          {student.user?.full_name || student.user?.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={assigningStudent || !assignStudentId || assignStudentId === 'none'}>
                {assigningStudent ? 'Adding...' : 'Add Student'}
              </Button>
            </form>

            {students.length === 0 && !loadingStudents && (
              <p className="text-sm text-muted-foreground">
                No students available. Add users with the student role first.
              </p>
            )}

            {/* Current Students List */}
            <div className="border rounded-md">
              <div className="p-3 border-b bg-muted/50">
                <h4 className="font-medium">Enrolled Students ({courseStudents.length})</h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {courseStudents.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">
                    No students enrolled yet
                  </p>
                ) : (
                  <div className="divide-y">
                    {courseStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium">{student.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStudentsDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
