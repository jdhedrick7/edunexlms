import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  addUserToInstitution,
  enrollUserInCourse,
  createStudentTutor,
  createTeacherAssistant,
  seedAnnouncement,
} from '@/lib/seed'

// Only allow in development mode
const isDevelopment = process.env.NODE_ENV === 'development'

export async function POST() {
  if (!isDevelopment) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to seed user data' },
        { status: 401 }
      )
    }

    // Check if user exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile first.' },
        { status: 400 }
      )
    }

    // Get the demo institution
    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .select('*')
      .eq('slug', 'demo-u')
      .single()

    if (institutionError || !institution) {
      return NextResponse.json(
        {
          error: 'Demo institution not found. Please run /api/dev/seed first to create demo data.',
          hint: 'POST to /api/dev/seed to create the demo institution and courses first.'
        },
        { status: 400 }
      )
    }

    const institutionId = institution.id

    // Add user to institution as admin
    const membershipResult = await addUserToInstitution(
      supabase,
      user.id,
      institutionId,
      'admin'
    )

    if (membershipResult.error) {
      return NextResponse.json(
        { error: membershipResult.error },
        { status: 500 }
      )
    }

    // Get all courses in the institution
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('institution_id', institutionId)

    if (coursesError) {
      return NextResponse.json(
        { error: `Error fetching courses: ${coursesError.message}` },
        { status: 500 }
      )
    }

    // Enroll user as teacher in all courses
    const enrollmentResults: {
      courseCode: string
      courseName: string
      role: string
      alreadyExists: boolean
    }[] = []

    for (const course of courses || []) {
      const result = await enrollUserInCourse(
        supabase,
        user.id,
        course.id,
        'teacher'
      )

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      enrollmentResults.push({
        courseCode: course.code,
        courseName: course.name,
        role: 'teacher',
        alreadyExists: result.alreadyExists,
      })

      // Create a welcome announcement for each course
      await seedAnnouncement(
        supabase,
        course.id,
        user.id,
        `Welcome to ${course.name}!`,
        `Welcome to ${course.code}: ${course.name}!\n\nThis is a demo course created for testing purposes. Feel free to explore the course materials and features.\n\nIf you have any questions, feel free to reach out to your instructor or use the AI tutor for assistance.`,
        true // pinned
      )
    }

    // Create student tutor record
    const tutorResult = await createStudentTutor(
      supabase,
      user.id,
      institutionId
    )

    if (tutorResult.error) {
      return NextResponse.json(
        { error: tutorResult.error },
        { status: 500 }
      )
    }

    // Create teacher assistant record
    const assistantResult = await createTeacherAssistant(
      supabase,
      user.id,
      institutionId
    )

    if (assistantResult.error) {
      return NextResponse.json(
        { error: assistantResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User data seeded successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        institution: {
          id: institutionId,
          name: institution.name,
          slug: institution.slug,
          role: 'admin',
          alreadyExists: membershipResult.alreadyExists,
        },
        enrollments: enrollmentResults,
        studentTutor: {
          id: tutorResult.data?.id,
          alreadyExists: tutorResult.alreadyExists,
        },
        teacherAssistant: {
          id: assistantResult.data?.id,
          alreadyExists: assistantResult.alreadyExists,
        },
      },
    })
  } catch (error) {
    console.error('Seed user error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during seeding' },
      { status: 500 }
    )
  }
}

export async function GET() {
  if (!isDevelopment) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    message: 'POST to this endpoint to add the authenticated user to demo data',
    endpoint: '/api/dev/seed-user',
    method: 'POST',
    prerequisites: [
      'User must be logged in',
      'Demo data must exist (POST to /api/dev/seed first)',
    ],
    actions: [
      'Adds user to Demo University as admin',
      'Enrolls user as teacher in all sample courses',
      'Creates student_tutor record',
      'Creates teacher_assistant record',
      'Creates welcome announcements for each course',
    ],
  })
}
