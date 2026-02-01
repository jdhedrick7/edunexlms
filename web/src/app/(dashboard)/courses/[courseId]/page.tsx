import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CourseTabs } from '@/components/course/course-tabs'
import { fetchCourseModules } from '@/lib/course-storage'
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

  // Fetch modules from storage
  let modules: Awaited<ReturnType<typeof fetchCourseModules>> = []
  if (versionToShow && course.institution) {
    modules = await fetchCourseModules(
      supabase,
      course.institution.id,
      versionToShow.storage_path
    )
  }

  // Fetch all announcements
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

  // Staff-specific data
  let students = undefined
  let submissions = undefined
  let analytics = undefined

  if (isStaff) {
    // Get all students
    const { data: studentEnrollments } = await supabase
      .from('enrollments')
      .select(`
        user_id,
        enrolled_at,
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .eq('role', 'student')
      .order('enrolled_at', { ascending: true })

    students = (studentEnrollments || []).map((e) => ({
      ...e.user as {
        id: string
        full_name: string | null
        email: string
        avatar_url: string | null
      },
      enrolledAt: e.enrolled_at,
    }))

    // Get submissions with user info
    const { data: submissionsData } = await supabase
      .from('submissions')
      .select(`
        id,
        assignment_path,
        status,
        submitted_at,
        user_id,
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('submitted_at', { ascending: false })

    // Get grades to check which are graded
    const { data: grades } = await supabase
      .from('grades')
      .select('user_id, assignment_path')
      .eq('course_id', courseId)

    const gradedSet = new Set(
      (grades || []).map(g => `${g.user_id}:${g.assignment_path}`)
    )

    submissions = (submissionsData || []).map((s) => ({
      id: s.id,
      assignment_path: s.assignment_path,
      status: s.status,
      submitted_at: s.submitted_at,
      student: s.user as {
        id: string
        full_name: string | null
        email: string
        avatar_url: string | null
      },
      isGraded: gradedSet.has(`${s.user_id}:${s.assignment_path}`),
    }))

    // Analytics data
    const { count: studentCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('role', 'student')

    const { count: staffCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .in('role', ['teacher', 'ta'])

    const totalSubmissions = submissionsData?.length || 0
    const pendingSubmissions = submissionsData?.filter(s => s.status === 'submitted').length || 0

    const { data: allGrades } = await supabase
      .from('grades')
      .select('points_earned, points_possible')
      .eq('course_id', courseId)

    const gradedCount = allGrades?.length || 0
    const averageScore = gradedCount > 0
      ? Math.round(
          allGrades!.reduce((sum, g) => sum + ((g.points_earned || 0) / g.points_possible) * 100, 0) / gradedCount
        )
      : 0

    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select('id, score, max_score, submitted_at')
      .eq('course_id', courseId)

    const completedQuizzes = quizAttempts?.filter(q => q.submitted_at).length || 0
    const averageQuizScore = completedQuizzes > 0
      ? Math.round(
          quizAttempts!
            .filter(q => q.submitted_at && q.max_score && q.max_score > 0)
            .reduce((sum, q) => sum + ((q.score || 0) / q.max_score!) * 100, 0) / completedQuizzes
        )
      : 0

    const { count: announcementCount } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)

    analytics = {
      studentCount: studentCount || 0,
      staffCount: staffCount || 0,
      totalSubmissions,
      pendingSubmissions,
      gradedCount,
      averageScore,
      completedQuizzes,
      averageQuizScore,
      announcementCount: announcementCount || 0,
    }
  }

  // Student-specific data (grades)
  let studentGrades = undefined
  if (enrollment.role === 'student') {
    const { data: myGrades } = await supabase
      .from('grades')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('graded_at', { ascending: false })

    studentGrades = (myGrades || []).map(g => ({
      assignment_path: g.assignment_path,
      title: g.assignment_path.split('/').slice(-2, -1)[0]?.replace(/^\d+-/, '').replace(/-/g, ' ') || g.assignment_path,
      points_earned: g.points_earned,
      points_possible: g.points_possible,
      graded_at: g.graded_at,
    }))
  }

  return (
    <CourseTabs
      course={course}
      enrollment={{ role: enrollment.role as EnrollmentRole }}
      latestDraftVersion={latestDraftVersion}
      modules={modules}
      announcements={announcements || []}
      students={students}
      submissions={submissions}
      analytics={analytics}
      studentGrades={studentGrades}
    />
  )
}
