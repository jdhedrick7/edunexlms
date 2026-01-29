'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Course, CourseVersion, EnrollmentRole } from '@/types/database'
import { Settings, BookOpen, Megaphone, Users, FileText, BarChart3, GitBranch, GraduationCap } from 'lucide-react'

interface CourseHeaderProps {
  course: Course & {
    institution?: { name: string } | null
    published_version?: CourseVersion | null
  }
  enrollment: {
    role: EnrollmentRole
  }
  latestDraftVersion?: CourseVersion | null
}

export function CourseHeader({ course, enrollment, latestDraftVersion }: CourseHeaderProps) {
  const pathname = usePathname()
  const isStaff = enrollment.role === 'teacher' || enrollment.role === 'ta'
  const baseUrl = `/courses/${course.id}`

  const tabs = [
    {
      name: 'Content',
      href: baseUrl,
      icon: BookOpen,
      active: pathname === baseUrl || pathname.startsWith(`${baseUrl}/modules`),
    },
    {
      name: 'Announcements',
      href: `${baseUrl}/announcements`,
      icon: Megaphone,
      active: pathname === `${baseUrl}/announcements`,
    },
  ]

  // Student-only tabs
  if (enrollment.role === 'student') {
    tabs.push({
      name: 'My Grades',
      href: `${baseUrl}/grades`,
      icon: GraduationCap,
      active: pathname === `${baseUrl}/grades`,
    })
  }

  // Staff-only tabs
  if (isStaff) {
    tabs.push(
      {
        name: 'Gradebook',
        href: `${baseUrl}/gradebook`,
        icon: GraduationCap,
        active: pathname.startsWith(`${baseUrl}/gradebook`),
      },
      {
        name: 'Submissions',
        href: `${baseUrl}/submissions`,
        icon: FileText,
        active: pathname === `${baseUrl}/submissions`,
      },
      {
        name: 'Students',
        href: `${baseUrl}/students`,
        icon: Users,
        active: pathname === `${baseUrl}/students`,
      },
      {
        name: 'Analytics',
        href: `${baseUrl}/analytics`,
        icon: BarChart3,
        active: pathname === `${baseUrl}/analytics`,
      }
    )
  }

  // Teacher-only tabs
  if (enrollment.role === 'teacher') {
    tabs.push({
      name: 'Versions',
      href: `${baseUrl}/versions`,
      icon: GitBranch,
      active: pathname === `${baseUrl}/versions`,
    })
  }

  return (
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
                    <span className="sr-only">Course Settings</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Version status indicator for staff */}
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
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                tab.active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {tab.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
