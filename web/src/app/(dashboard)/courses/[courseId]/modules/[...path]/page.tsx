import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CourseHeader } from '@/components/course/course-header'
import { ModuleList } from '@/components/course/module-list'
import { ContentRenderer, type AssignmentContent, type QuizContent } from '@/components/course/content-renderer'
import { fetchCourseModules, fetchModuleContent } from '@/lib/course-storage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, ChevronLeft, ChevronRight, Home, AlertCircle } from 'lucide-react'
import type { EnrollmentRole } from '@/types/database'

interface ModulePageProps {
  params: Promise<{ courseId: string; path: string[] }>
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { courseId, path } = await params
  const modulePath = path.join('/')
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
  const versionToShow = isStaff && latestDraftVersion
    ? latestDraftVersion
    : course.published_version

  if (!versionToShow || !course.institution) {
    notFound()
  }

  // Fetch modules for navigation
  const modules = await fetchCourseModules(
    supabase,
    course.institution.id,
    versionToShow.storage_path
  )

  // Fetch the specific module content
  const { content, contentType } = await fetchModuleContent(
    supabase,
    course.institution.id,
    versionToShow.storage_path,
    modulePath
  )

  if (!content || contentType === 'unknown') {
    notFound()
  }

  // Get submission status for assignments
  let submission: { status: string; submitted_at?: string } | null = null
  if (contentType === 'assignment' && !isStaff) {
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('status, submitted_at')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .eq('assignment_path', `modules/${modulePath.replace('/assignment', '')}/assignment.json`)
      .single()

    if (existingSubmission && existingSubmission.status) {
      submission = {
        status: existingSubmission.status,
        submitted_at: existingSubmission.submitted_at ?? undefined
      }
    }
  }

  // Get quiz attempts count
  let quizAttempts = 0
  if (contentType === 'quiz' && !isStaff) {
    const { count } = await supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .eq('quiz_path', `modules/${modulePath.replace('/quiz', '')}/quiz.json`)

    quizAttempts = count || 0
  }

  // Build flat list for navigation
  const flatItems: Array<{ path: string; title: string }> = []
  for (const courseModule of modules) {
    if (courseModule.children) {
      for (const child of courseModule.children) {
        flatItems.push({ path: child.path, title: child.title || child.name })
      }
    }
  }

  // Find current, previous, and next items
  const currentIndex = flatItems.findIndex((item) => item.path === modulePath)
  const prevItem = currentIndex > 0 ? flatItems[currentIndex - 1] : null
  const nextItem = currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null

  // Get current module title
  const currentModuleName = path[0]
  const currentModule = modules.find((m) => m.name === currentModuleName)
  const currentItemTitle = currentModule?.children?.find((c) => c.path === modulePath)?.title
    || currentModule?.title
    || modulePath

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
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/courses/${courseId}`} className="hover:text-foreground transition-colors">
              <Home className="size-4" />
            </Link>
            <ChevronRight className="size-4" />
            {currentModule && (
              <>
                <span>{currentModule.title || currentModule.name}</span>
                {currentItemTitle !== currentModule.title && (
                  <>
                    <ChevronRight className="size-4" />
                    <span className="text-foreground">{currentItemTitle}</span>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Content */}
          <div className="max-w-4xl">
            <ContentRenderer
              content={content as string | AssignmentContent | QuizContent}
              contentType={contentType}
              courseId={courseId}
              modulePath={modulePath}
              isStaff={isStaff}
              submission={submission}
              quizAttempts={quizAttempts}
            />
          </div>

          {/* Navigation footer */}
          <div className="mt-12 flex items-center justify-between border-t pt-6">
            {prevItem ? (
              <Link href={`/courses/${courseId}/modules/${prevItem.path}`}>
                <Button variant="outline" className="gap-2">
                  <ChevronLeft className="size-4" />
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">Previous</div>
                    <div className="text-sm">{prevItem.title}</div>
                  </div>
                </Button>
              </Link>
            ) : (
              <div />
            )}
            {nextItem ? (
              <Link href={`/courses/${courseId}/modules/${nextItem.path}`}>
                <Button variant="outline" className="gap-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Next</div>
                    <div className="text-sm">{nextItem.title}</div>
                  </div>
                  <ChevronRight className="size-4" />
                </Button>
              </Link>
            ) : (
              <Link href={`/courses/${courseId}`}>
                <Button variant="outline" className="gap-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Finished</div>
                    <div className="text-sm">Back to Course</div>
                  </div>
                  <ChevronRight className="size-4" />
                </Button>
              </Link>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// Handle content not found
export function ContentNotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Content Not Found</h3>
        <p className="mt-2 text-center text-sm text-muted-foreground max-w-md">
          The requested module content could not be found.
          It may have been removed or moved to a different location.
        </p>
        <Link href=".." className="mt-4">
          <Button variant="outline">
            <ChevronLeft className="mr-2 size-4" />
            Go Back
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
