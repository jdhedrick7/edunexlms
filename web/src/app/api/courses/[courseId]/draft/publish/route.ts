import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Module {
  id: string
  order: number
  title: string
  description: string
  content: string
  assignment: {
    title: string
    description: string
    instructions: string
    dueInDays: number
    pointsPossible: number
    submissionType: 'text' | 'file' | 'both'
  } | null
  quiz: {
    title: string
    description: string
    timeLimit: number | null
    attemptsAllowed: number
    questions: {
      id: string
      type: 'multiple_choice' | 'true_false' | 'short_answer'
      question: string
      options?: string[]
      correctAnswer: string | number
      points: number
    }[]
  } | null
}

// POST: Convert draft to a course version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if teacher
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('role')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!enrollment || enrollment.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('institution_id, code, name')
    .eq('id', courseId)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const body = await request.json()
  const modules: Module[] = body.modules || []

  if (modules.length === 0) {
    return NextResponse.json({ error: 'No modules to publish' }, { status: 400 })
  }

  const bucketId = `inst-${course.institution_id}`
  const adminClient = createAdminClient()

  // Get next version number
  const { data: maxVersion } = await supabase
    .from('course_versions')
    .select('version_number')
    .eq('course_id', courseId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const newVersionNumber = (maxVersion?.version_number || 0) + 1
  const versionId = crypto.randomUUID()
  const storagePath = `courses/${courseId}/material/${versionId}`

  const uploadErrors: string[] = []
  let uploadedCount = 0

  // Upload each module
  for (const module of modules) {
    const moduleFolder = `${String(module.order).padStart(2, '0')}-${slugify(module.title)}`
    const modulePath = `${storagePath}/modules/${moduleFolder}`

    // module.json
    const moduleJson = {
      title: module.title,
      description: module.description,
      order: module.order,
    }

    try {
      await adminClient.storage
        .from(bucketId)
        .upload(`${modulePath}/module.json`, JSON.stringify(moduleJson, null, 2), {
          contentType: 'application/json',
          upsert: true,
        })
      uploadedCount++
    } catch (err) {
      uploadErrors.push(`Failed to upload module.json for ${module.title}`)
    }

    // content.md
    if (module.content) {
      try {
        await adminClient.storage
          .from(bucketId)
          .upload(`${modulePath}/content.md`, module.content, {
            contentType: 'text/markdown',
            upsert: true,
          })
        uploadedCount++
      } catch (err) {
        uploadErrors.push(`Failed to upload content.md for ${module.title}`)
      }
    }

    // assignment.json
    if (module.assignment) {
      const assignmentJson = {
        title: module.assignment.title,
        description: module.assignment.description,
        instructions: module.assignment.instructions,
        dueInDays: module.assignment.dueInDays,
        pointsPossible: module.assignment.pointsPossible,
        submissionType: module.assignment.submissionType,
        rubric: [], // Can be extended later
      }

      try {
        await adminClient.storage
          .from(bucketId)
          .upload(`${modulePath}/assignment.json`, JSON.stringify(assignmentJson, null, 2), {
            contentType: 'application/json',
            upsert: true,
          })
        uploadedCount++
      } catch (err) {
        uploadErrors.push(`Failed to upload assignment.json for ${module.title}`)
      }
    }

    // quiz.json
    if (module.quiz) {
      const quizJson = {
        title: module.quiz.title,
        description: module.quiz.description,
        settings: {
          timeLimit: module.quiz.timeLimit,
          attemptsAllowed: module.quiz.attemptsAllowed,
          shuffleQuestions: false,
          showCorrectAnswers: true,
        },
        questions: module.quiz.questions.map((q, idx) => ({
          id: q.id,
          order: idx + 1,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
        })),
      }

      try {
        await adminClient.storage
          .from(bucketId)
          .upload(`${modulePath}/quiz.json`, JSON.stringify(quizJson, null, 2), {
            contentType: 'application/json',
            upsert: true,
          })
        uploadedCount++
      } catch (err) {
        uploadErrors.push(`Failed to upload quiz.json for ${module.title}`)
      }
    }
  }

  if (uploadedCount === 0) {
    return NextResponse.json(
      { error: 'Failed to upload any files', errors: uploadErrors },
      { status: 500 }
    )
  }

  // Create version record
  const { data: newVersion, error: versionError } = await supabase
    .from('course_versions')
    .insert({
      id: versionId,
      course_id: courseId,
      version_number: newVersionNumber,
      storage_path: storagePath,
      status: 'draft',
      notes: `Created from Course Builder (${modules.length} modules)`,
      created_by: user.id,
    })
    .select()
    .single()

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    version: newVersion,
    uploadedFiles: uploadedCount,
    errors: uploadErrors.length > 0 ? uploadErrors : undefined,
  }, { status: 201 })
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}
