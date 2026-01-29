import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get user's institution memberships
  const { data: memberships } = await supabase
    .from('institution_members')
    .select(`
      *,
      institution:institutions(*)
    `)
    .eq('user_id', user.id)

  // Get user's course enrollments to determine if they're a teacher/TA
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('role')
    .eq('user_id', user.id)

  // Determine if user is a teacher or TA (either via enrollment or institution membership)
  const isTeacherOrTA = (enrollments?.some(e => e.role === 'teacher' || e.role === 'ta')) ||
                        (memberships?.some(m => m.role === 'teacher' || m.role === 'ta' || m.role === 'admin'))

  // Determine if user is an admin
  const isAdmin = memberships?.some(m => m.role === 'admin') || false

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={profile} memberships={memberships || []} />
      <div className="flex">
        <DashboardNav isTeacherOrTA={isTeacherOrTA || false} isAdmin={isAdmin} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
