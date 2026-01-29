import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedInstitution, seedCourse } from '@/lib/seed'

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

    // Create Demo University
    const institutionResult = await seedInstitution(
      supabase,
      'Demo University',
      'demo-u'
    )

    if (institutionResult.error) {
      return NextResponse.json(
        { error: institutionResult.error },
        { status: 500 }
      )
    }

    const institution = institutionResult.data!
    const institutionId = institution.id

    // Create sample courses
    const courses: {
      code: string
      name: string
      description: string
    }[] = [
      {
        code: 'CS101',
        name: 'Introduction to Computer Science',
        description: 'An introductory course covering fundamental concepts of computer science including algorithms, data structures, and programming basics.',
      },
      {
        code: 'MATH201',
        name: 'Calculus II',
        description: 'Advanced calculus covering integration techniques, sequences, series, and multivariable calculus fundamentals.',
      },
    ]

    const courseResults: {
      code: string
      id: string
      name: string
      alreadyExists: boolean
    }[] = []

    for (const course of courses) {
      const result = await seedCourse(
        supabase,
        institutionId,
        course.code,
        course.name,
        course.description
      )

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      courseResults.push({
        code: course.code,
        id: result.data!.id,
        name: course.name,
        alreadyExists: result.alreadyExists,
      })
    }

    return NextResponse.json({
      success: true,
      message: institutionResult.alreadyExists
        ? 'Demo data already exists'
        : 'Demo data created successfully',
      data: {
        institution: {
          id: institutionId,
          name: institution.name,
          slug: institution.slug,
          alreadyExists: institutionResult.alreadyExists,
        },
        courses: courseResults,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
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
    message: 'POST to this endpoint to seed demo data',
    endpoint: '/api/dev/seed',
    method: 'POST',
  })
}
