import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CourseHeader } from '@/components/course/course-header'
import { ModuleList } from '@/components/course/module-list'
import { fetchCourseModules } from '@/lib/course-storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Megaphone, Clock, Pin, FolderOpen, BookOpen, AlertCircle } from 'lucide-react'
import type { EnrollmentRole } from '@/types/database'

interface CoursePageProps {
  params: Promise<{ courseId: string }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch course with related data
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      *,
      institution:institutions(id, name),
      published_version:course_versions!fk_published_version(*)
    `)
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    notFound()
  }

  // Check user enrollment
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (enrollmentError || !enrollment) {
    // User is not enrolled in this course
    notFound()
  }

  const isStaff = enrollment.role === 'teacher' || enrollment.role === 'ta'

  // For staff, also get the latest draft version
  let latestDraftVersion = null
  if (isStaff) {
    const { data: draftVersions } = await supabase
      .from('course_versions')
      .select('*')
      .eq('course_id', courseId)
      .in('status', ['draft', 'review'])
      .order('version_number', { ascending: false })
      .limit(1)

    latestDraftVersion = draftVersions?.[0] ?? null
  }

  // Determine which version to show
  // Staff can see draft versions, students only see published
  const versionToShow = isStaff && latestDraftVersion
    ? latestDraftVersion
    : course.published_version

  // Fetch modules from storage
  let modules: Awaited<ReturnType<typeof fetchCourseModules>> = []
  if (versionToShow && course.institution) {
    modules = await fetchCourseModules(
      supabase,
      course.institution.id,
      versionToShow.storage_path
    )
  }

  // Fetch recent announcements (limit 3 for overview)
  const now = new Date().toISOString()
  const { data: announcements } = await supabase
    .from('announcements')
    .select(`
      *,
      author:users(full_name, avatar_url)
    `)
    .eq('course_id', courseId)
    .lte('publish_at', now)
    .order('pinned', { ascending: false })
    .order('publish_at', { ascending: false })
    .limit(3)

  return (
    <div className="-m-6">
      <CourseHeader
        course={course}
        enrollment={{ role: enrollment.role as EnrollmentRole }}
        latestDraftVersion={latestDraftVersion}
      />

      <div className="flex">
        {/* Sidebar - Module navigation */}
        <aside className="hidden w-72 shrink-0 border-r bg-muted/30 p-4 lg:block">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <BookOpen className="size-4" />
              Course Content
            </h2>
          </div>
          <ModuleList
            courseId={courseId}
            modules={modules}
            isStaff={isStaff}
          />
        </aside>

        {/* Main content area */}
        <main className="flex-1 p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column - Course overview */}
            <div className="lg:col-span-2 space-y-6">
              {/* No content placeholder */}
              {modules.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FolderOpen className="size-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No Course Content Yet</h3>
                    <p className="mt-2 text-center text-sm text-muted-foreground max-w-md">
                      {isStaff ? (
                        <>
                          This course doesn&apos;t have any published content yet.
                          Create and publish a course version to add modules and materials.
                        </>
                      ) : (
                        <>
                          Your instructor hasn&apos;t published any content for this course yet.
                          Check back later or contact your instructor for more information.
                        </>
                      )}
                    </p>
                    {enrollment.role === 'teacher' && (
                      <Link href={`/courses/${courseId}/versions`} className="mt-4">
                        <Button>
                          Manage Versions
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Module overview for mobile */}
              {modules.length > 0 && (
                <Card className="lg:hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="size-5" />
                      Course Modules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ModuleList
                      courseId={courseId}
                      modules={modules}
                      isStaff={isStaff}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Quick start guide for students */}
              {!isStaff && modules.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>
                      Welcome to {course.name}. Here&apos;s how to get started:
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          1
                        </div>
                        <div>
                          <p className="font-medium">Browse the course content</p>
                          <p className="text-sm text-muted-foreground">
                            Use the sidebar to navigate through modules and lessons.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          2
                        </div>
                        <div>
                          <p className="font-medium">Complete assignments and quizzes</p>
                          <p className="text-sm text-muted-foreground">
                            Each module may include assignments or quizzes for you to complete.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          3
                        </div>
                        <div>
                          <p className="font-medium">Ask your AI Tutor for help</p>
                          <p className="text-sm text-muted-foreground">
                            Your personal AI tutor can help explain concepts and answer questions.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column - Announcements */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Megaphone className="size-5" />
                      Announcements
                    </CardTitle>
                    {announcements && announcements.length > 0 && (
                      <CardDescription>
                        Latest updates from your instructor
                      </CardDescription>
                    )}
                  </div>
                  <Link href={`/courses/${courseId}/announcements`}>
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {(!announcements || announcements.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="size-10 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No announcements yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <Link
                          key={announcement.id}
                          href={`/courses/${courseId}/announcements#${announcement.id}`}
                          className="block"
                        >
                          <div className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                            <div className="flex items-start gap-2">
                              {announcement.pinned && (
                                <Pin className="size-4 shrink-0 text-primary mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium line-clamp-1">
                                  {announcement.title}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                  {announcement.content.replace(/[#*_`]/g, '').substring(0, 150)}
                                </p>
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="size-3" />
                                  <span>
                                    {new Date(announcement.publish_at || announcement.created_at || '').toLocaleDateString()}
                                  </span>
                                  {announcement.author && (
                                    <>
                                      <span>by</span>
                                      <span>{announcement.author.full_name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
