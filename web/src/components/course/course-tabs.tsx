'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ModuleList, type ModuleItem } from '@/components/course/module-list'
import { CourseBuilder } from '@/components/course/course-builder'
import { CourseVersionsTab } from '@/components/course/course-versions-tab'
import type { Course, CourseVersion, EnrollmentRole } from '@/types/database'
import {
  Settings,
  BookOpen,
  Megaphone,
  Users,
  FileText,
  BarChart3,
  GitBranch,
  GraduationCap,
  PenToolIcon,
  Clock,
  Pin,
  FolderOpen,
  AlertCircle,
  MailIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react'

// Types for all the data we need
interface Announcement {
  id: string
  title: string
  content: string
  pinned: boolean | null
  publish_at: string | null
  created_at: string | null
  author: { full_name: string | null; avatar_url: string | null } | null
}

interface Student {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  enrolledAt: string | null
}

interface Submission {
  id: string
  assignment_path: string
  status: string | null
  submitted_at: string | null
  student: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }
  isGraded: boolean
}

interface StudentGrade {
  assignment_path: string
  title: string
  points_earned: number | null
  points_possible: number
  graded_at: string | null
}

interface AnalyticsData {
  studentCount: number
  staffCount: number
  totalSubmissions: number
  pendingSubmissions: number
  gradedCount: number
  averageScore: number
  completedQuizzes: number
  averageQuizScore: number
  announcementCount: number
}

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

interface CourseTabsProps {
  course: Course & {
    institution?: { id: string; name: string } | null
    published_version?: CourseVersion | null
  }
  enrollment: { role: EnrollmentRole }
  latestDraftVersion?: CourseVersion | null
  modules: ModuleItem[]
  announcements: Announcement[]
  // Staff data
  students?: Student[]
  submissions?: Submission[]
  analytics?: AnalyticsData
  // Teacher data
  versions?: Version[]
  // Student data
  studentGrades?: StudentGrade[]
}

type TabId = 'content' | 'announcements' | 'grades' | 'gradebook' | 'submissions' | 'students' | 'analytics' | 'builder' | 'versions'

export function CourseTabs({
  course,
  enrollment,
  latestDraftVersion,
  modules,
  announcements,
  students,
  submissions,
  analytics,
  versions,
  studentGrades,
}: CourseTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('content')
  const [versionsData, setVersionsData] = useState(versions || [])
  const isStaff = enrollment.role === 'teacher' || enrollment.role === 'ta'
  const baseUrl = `/courses/${course.id}`

  const tabs: { id: TabId; name: string; icon: typeof BookOpen }[] = [
    { id: 'content', name: 'Content', icon: BookOpen },
    { id: 'announcements', name: 'Announcements', icon: Megaphone },
  ]

  if (enrollment.role === 'student') {
    tabs.push({ id: 'grades', name: 'My Grades', icon: GraduationCap })
  }

  if (isStaff) {
    tabs.push(
      { id: 'gradebook', name: 'Gradebook', icon: GraduationCap },
      { id: 'submissions', name: 'Submissions', icon: FileText },
      { id: 'students', name: 'Students', icon: Users },
      { id: 'analytics', name: 'Analytics', icon: BarChart3 }
    )
  }

  if (enrollment.role === 'teacher') {
    tabs.push(
      { id: 'builder', name: 'Builder', icon: PenToolIcon },
      { id: 'versions', name: 'Versions', icon: GitBranch }
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not submitted'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const getAssignmentName = (path: string) => {
    const parts = path.split('/')
    if (parts.length >= 2) {
      return parts[parts.length - 2].replace(/^\d+-/, '').replace(/-/g, ' ')
    }
    return path
  }

  return (
    <div className="-m-6">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{course.institution?.name}</span>
                <span>/</span>
                <span className="font-medium text-foreground">{course.code}</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold">{course.name}</h1>
              {course.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2 max-w-2xl">
                  {course.description}
                </p>
              )}
            </div>

            {isStaff && (
              <div className="flex items-center gap-2">
                {latestDraftVersion && enrollment.role === 'teacher' && (
                  <Link href={`${baseUrl}/versions/${latestDraftVersion.id}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="mr-1.5 size-4" />
                      Review Draft (v{latestDraftVersion.version_number})
                    </Button>
                  </Link>
                )}
                {enrollment.role === 'teacher' && (
                  <Link href={`${baseUrl}/settings`}>
                    <Button variant="ghost" size="icon">
                      <Settings className="size-4" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {isStaff && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              {course.published_version ? (
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">
                    Published: v{course.published_version.version_number}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">No published version</span>
                </div>
              )}
              {latestDraftVersion && (
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">
                    Draft: v{latestDraftVersion.version_number} ({latestDraftVersion.status})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                <Icon className="size-4" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="flex gap-6">
            <aside className="hidden w-72 shrink-0 lg:block">
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <BookOpen className="size-4" />
                  Course Content
                </h2>
              </div>
              <ModuleList courseId={course.id} modules={modules} isStaff={isStaff} />
            </aside>

            <main className="flex-1">
              {modules.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FolderOpen className="size-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No Course Content Yet</h3>
                    <p className="mt-2 text-center text-sm text-muted-foreground max-w-md">
                      {isStaff
                        ? "This course doesn't have any published content yet. Create and publish a course version to add modules."
                        : "Your instructor hasn't published any content yet. Check back later."}
                    </p>
                    {enrollment.role === 'teacher' && (
                      <Link href={`${baseUrl}/versions`} className="mt-4">
                        <Button>Manage Versions</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="lg:hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="size-5" />
                      Course Modules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ModuleList courseId={course.id} modules={modules} isStaff={isStaff} />
                  </CardContent>
                </Card>
              )}
            </main>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Announcements</h2>
              {isStaff && (
                <Link href={`${baseUrl}/announcements/new`}>
                  <Button>New Announcement</Button>
                </Link>
              )}
            </div>
            {announcements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="size-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No announcements yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader>
                      <div className="flex items-start gap-2">
                        {announcement.pinned && <Pin className="size-4 text-primary mt-1" />}
                        <div className="flex-1">
                          <CardTitle>{announcement.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Clock className="size-3" />
                            {formatDate(announcement.publish_at || announcement.created_at)}
                            {announcement.author?.full_name && (
                              <span>by {announcement.author.full_name}</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Student Grades Tab */}
        {activeTab === 'grades' && studentGrades && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">My Grades</h2>
            {studentGrades.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <GraduationCap className="size-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No grades yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {studentGrades.map((grade, i) => (
                      <div key={i} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{grade.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {grade.graded_at ? formatDate(grade.graded_at) : 'Pending'}
                          </p>
                        </div>
                        <div className="text-right">
                          {grade.points_earned !== null ? (
                            <>
                              <p className="font-bold">
                                {grade.points_earned} / {grade.points_possible}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {Math.round((grade.points_earned / grade.points_possible) * 100)}%
                              </p>
                            </>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Gradebook Tab */}
        {activeTab === 'gradebook' && isStaff && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Gradebook</h2>
            </div>
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <GraduationCap className="size-12 mx-auto mb-4 opacity-50" />
                <p>Click on a student to view and edit their grades</p>
                <Link href={`${baseUrl}/gradebook`} className="mt-4 inline-block">
                  <Button variant="outline">Open Full Gradebook</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && isStaff && submissions && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Submissions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{submissions.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Review</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {submissions.filter(s => s.status === 'submitted' && !s.isGraded).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Graded</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {submissions.filter(s => s.isGraded).length}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No submissions yet</p>
                ) : (
                  <div className="divide-y">
                    {submissions.slice(0, 10).map((submission) => (
                      <Link
                        key={submission.id}
                        href={`${baseUrl}/gradebook/${submission.student.id}/${encodeURIComponent(submission.assignment_path)}`}
                        className="flex items-center gap-4 py-3 hover:bg-muted/50 -mx-4 px-4 rounded transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={submission.student.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(submission.student.full_name, submission.student.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {submission.student.full_name || submission.student.email}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {getAssignmentName(submission.assignment_path)}
                          </p>
                        </div>
                        <div className="text-right">
                          {submission.isGraded ? (
                            <Badge className="bg-green-500">Graded</Badge>
                          ) : submission.status === 'submitted' ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline">{submission.status}</Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(submission.submitted_at)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && isStaff && students && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Students ({students.length})</h2>
            <Card>
              <CardContent className="p-0">
                {students.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <UsersIcon className="size-12 mx-auto mb-4 opacity-50" />
                    <p>No students enrolled yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center gap-4 p-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(student.full_name, student.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {student.full_name || 'Unnamed Student'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1 truncate">
                              <MailIcon className="h-3 w-3" />
                              {student.email}
                            </span>
                            {student.enrolledAt && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {formatDate(student.enrolledAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={`${baseUrl}/gradebook?student=${student.id}`}>
                          <Button variant="outline" size="sm">View Grades</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && isStaff && analytics && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Analytics</h2>

            <div>
              <h3 className="text-lg font-semibold mb-4">Enrollment</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Students</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.studentCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Staff</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.staffCount}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Assignments</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Submissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalSubmissions}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pending</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{analytics.pendingSubmissions}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Graded</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{analytics.gradedCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Score</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.averageScore > 0 ? `${analytics.averageScore}%` : '-'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Quizzes</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Completed Attempts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.completedQuizzes}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Quiz Score</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.averageQuizScore > 0 ? `${analytics.averageQuizScore}%` : '-'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Builder Tab */}
        {activeTab === 'builder' && enrollment.role === 'teacher' && (
          <CourseBuilder
            courseId={course.id}
            onVersionCreated={() => setActiveTab('versions')}
          />
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && enrollment.role === 'teacher' && (
          <CourseVersionsTab
            courseId={course.id}
            versions={versionsData}
            publishedVersionId={course.published_version?.id || null}
            institutionId={course.institution?.id || ''}
            onVersionsChange={() => {
              // Refresh versions data
              fetch(`/api/courses/${course.id}/versions`)
                .then(res => res.json())
                .then(data => setVersionsData(data.versions || []))
            }}
          />
        )}
      </div>
    </div>
  )
}
