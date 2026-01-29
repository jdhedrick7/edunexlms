import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SubmissionForm } from '@/components/assignments/submission-form'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'

interface SubmitPageProps {
  params: Promise<{
    courseId: string
    assignmentPath: string
  }>
}

export default async function SubmitPage({ params }: SubmitPageProps) {
  const { courseId, assignmentPath } = await params
  const decodedPath = decodeURIComponent(assignmentPath)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment and ensure user is a student
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment) {
    redirect('/courses')
  }

  if (enrollment.role !== 'student') {
    redirect(`/courses/${courseId}/assignments/${assignmentPath}`)
  }

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, code')
    .eq('id', courseId)
    .single()

  if (!course) {
    notFound()
  }

  // Get existing submission if any
  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .eq('assignment_path', decodedPath)
    .single()

  // Check if already graded
  const { data: grade } = await supabase
    .from('grades')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .eq('assignment_path', decodedPath)
    .single()

  const isGraded = !!grade

  // Generate assignment title from path
  const assignmentTitle = decodedPath
    .split('/')
    .pop()
    ?.replace('.json', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Assignment'

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/courses/${courseId}/assignments/${assignmentPath}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Assignment
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{assignmentTitle}</h1>
        <p className="text-muted-foreground">
          {course.code} - {course.name}
        </p>
      </div>

      <SubmissionForm
        courseId={courseId}
        assignmentPath={decodedPath}
        assignmentTitle={assignmentTitle}
        submissionTypes={['text', 'file']}
        existingSubmission={
          submission
            ? {
                id: submission.id,
                text_content: submission.text_content,
                status: submission.status,
                submitted_at: submission.submitted_at,
              }
            : undefined
        }
        isGraded={isGraded}
      />
    </div>
  )
}
