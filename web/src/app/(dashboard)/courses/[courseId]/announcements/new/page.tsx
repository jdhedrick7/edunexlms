import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnnouncementForm } from '@/components/announcements/announcement-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface NewAnnouncementPageProps {
  params: Promise<{
    courseId: string
  }>
}

export default async function NewAnnouncementPage({ params }: NewAnnouncementPageProps) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check enrollment and role
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (enrollmentError || !enrollment) {
    redirect('/courses')
  }

  // Only teachers and TAs can create announcements
  if (enrollment.role !== 'teacher' && enrollment.role !== 'ta') {
    redirect(`/courses/${courseId}/announcements`)
  }

  // Get course info for breadcrumb
  const { data: course } = await supabase
    .from('courses')
    .select('name, code')
    .eq('id', courseId)
    .single()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/courses/${courseId}/announcements`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Announcement</h1>
          <p className="text-muted-foreground">
            {course?.name || 'Course'} - Create a new announcement for your students
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <AnnouncementForm courseId={courseId} mode="create" />
      </div>
    </div>
  )
}
