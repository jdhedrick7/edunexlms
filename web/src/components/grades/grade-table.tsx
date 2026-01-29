'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircleIcon, ClockIcon, SearchIcon } from 'lucide-react'

interface Student {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

interface Assignment {
  path: string
  title: string
  points: number
}

interface SubmissionWithGrade {
  id: string
  status: string | null
  submitted_at: string | null
  grade?: {
    points_earned: number | null
    points_possible: number
  } | null
}

interface StudentGrades {
  student: Student
  submissions: Record<string, SubmissionWithGrade | undefined>
  totalPoints: number
  earnedPoints: number
}

interface GradeTableProps {
  courseId: string
  students: StudentGrades[]
  assignments: Assignment[]
}

export function GradeTable({ courseId, students, assignments }: GradeTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'grade'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const filteredStudents = students
    .filter((s) => {
      const name = s.student.full_name?.toLowerCase() || ''
      const email = s.student.email.toLowerCase()
      const query = searchQuery.toLowerCase()
      return name.includes(query) || email.includes(query)
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.student.full_name || a.student.email
        const nameB = b.student.full_name || b.student.email
        return sortOrder === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA)
      } else {
        const gradeA = a.totalPoints > 0 ? (a.earnedPoints / a.totalPoints) * 100 : 0
        const gradeB = b.totalPoints > 0 ? (b.earnedPoints / b.totalPoints) * 100 : 0
        return sortOrder === 'asc' ? gradeA - gradeB : gradeB - gradeA
      }
    })

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const formatGrade = (earned: number | null | undefined, possible: number) => {
    if (earned === null || earned === undefined) return '-'
    return `${earned}/${possible}`
  }

  const getPercentage = (earned: number, total: number) => {
    if (total === 0) return 0
    return Math.round((earned / total) * 100)
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400'
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400'
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400'
    if (percentage >= 60) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'grade')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="grade">Grade</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                Student
              </TableHead>
              {assignments.map((assignment) => (
                <TableHead key={assignment.path} className="text-center min-w-[120px]">
                  <div className="space-y-1">
                    <p className="line-clamp-2">{assignment.title}</p>
                    <p className="text-xs text-muted-foreground">{assignment.points} pts</p>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[100px]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((studentGrades) => {
              const percentage = getPercentage(
                studentGrades.earnedPoints,
                studentGrades.totalPoints
              )

              return (
                <TableRow key={studentGrades.student.id}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={studentGrades.student.avatar_url || undefined}
                          alt={studentGrades.student.full_name || 'Student'}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(
                            studentGrades.student.full_name,
                            studentGrades.student.email
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {studentGrades.student.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {studentGrades.student.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  {assignments.map((assignment) => {
                    const submission = studentGrades.submissions[assignment.path]
                    const hasSubmission = !!submission
                    const isGraded = submission?.grade?.points_earned !== null && submission?.grade?.points_earned !== undefined

                    return (
                      <TableCell key={assignment.path} className="text-center">
                        <Link
                          href={`/courses/${courseId}/gradebook/${studentGrades.student.id}/${encodeURIComponent(assignment.path)}`}
                          className="block hover:bg-muted/50 rounded p-2 -m-2 transition-colors"
                        >
                          {!hasSubmission ? (
                            <span className="text-muted-foreground">-</span>
                          ) : isGraded ? (
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                              <span>
                                {formatGrade(
                                  submission?.grade?.points_earned,
                                  assignment.points
                                )}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <ClockIcon className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </Link>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <p className={`font-semibold ${getGradeColor(percentage)}`}>
                        {percentage}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {studentGrades.earnedPoints}/{studentGrades.totalPoints}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={assignments.length + 2}
                  className="text-center py-8 text-muted-foreground"
                >
                  No students found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredStudents.length} of {students.length} students
      </div>
    </div>
  )
}
