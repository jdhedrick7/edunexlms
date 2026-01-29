import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import { VersionList } from '@/components/course/version-list'

interface VersionsPageProps {
  params: Promise<{ courseId: string }>
}

export default async function VersionsPage({ params }: VersionsPageProps) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment - only teachers can access
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role !== 'teacher') {
    redirect(`/courses/${courseId}`)
  }

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      code,
      published_version_id,
      institution:institutions(id, name)
    `)
    .eq('id', courseId)
    .single()

  if (!course) {
    notFound()
  }

  // Get all versions
  const { data: versions } = await supabase
    .from('course_versions')
    .select(`
      *,
      created_by_user:users!course_versions_created_by_fkey(full_name, email),
      approved_by_user:users!course_versions_approved_by_fkey(full_name, email)
    `)
    .eq('course_id', courseId)
    .order('version_number', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/courses/${courseId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Versions</h1>
        <p className="text-muted-foreground">
          {course.code} - {course.name}
        </p>
      </div>

      <VersionList
        courseId={courseId}
        versions={versions || []}
        publishedVersionId={course.published_version_id}
        institutionId={course.institution?.id || ''}
      />
    </div>
  )
}
