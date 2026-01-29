import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type SupabaseClientType = SupabaseClient<Database>

export interface SeedResult<T> {
  data: T | null
  error: string | null
  alreadyExists: boolean
}

/**
 * Seeds an institution in the database.
 * Returns existing institution if slug already exists.
 */
export async function seedInstitution(
  supabase: SupabaseClientType,
  name: string,
  slug: string
): Promise<SeedResult<Database['public']['Tables']['institutions']['Row']>> {
  // Check if institution already exists
  const { data: existing, error: checkError } = await supabase
    .from('institutions')
    .select('*')
    .eq('slug', slug)
    .single()

  if (existing) {
    return {
      data: existing,
      error: null,
      alreadyExists: true,
    }
  }

  // Only create if not found (ignore PGRST116 "not found" error)
  if (checkError && checkError.code !== 'PGRST116') {
    return {
      data: null,
      error: `Error checking for existing institution: ${checkError.message}`,
      alreadyExists: false,
    }
  }

  // Create new institution
  const { data, error } = await supabase
    .from('institutions')
    .insert({
      name,
      slug,
      settings: {},
    })
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: `Error creating institution: ${error.message}`,
      alreadyExists: false,
    }
  }

  return {
    data,
    error: null,
    alreadyExists: false,
  }
}

/**
 * Seeds a course in the database.
 * Returns existing course if code already exists for the institution.
 */
export async function seedCourse(
  supabase: SupabaseClientType,
  institutionId: string,
  code: string,
  name: string,
  description?: string
): Promise<SeedResult<Database['public']['Tables']['courses']['Row']>> {
  // Check if course already exists
  const { data: existing, error: checkError } = await supabase
    .from('courses')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('code', code)
    .single()

  if (existing) {
    return {
      data: existing,
      error: null,
      alreadyExists: true,
    }
  }

  // Only create if not found (ignore PGRST116 "not found" error)
  if (checkError && checkError.code !== 'PGRST116') {
    return {
      data: null,
      error: `Error checking for existing course: ${checkError.message}`,
      alreadyExists: false,
    }
  }

  // Create new course
  const { data, error } = await supabase
    .from('courses')
    .insert({
      institution_id: institutionId,
      code,
      name,
      description: description || null,
      settings: {},
    })
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: `Error creating course: ${error.message}`,
      alreadyExists: false,
    }
  }

  return {
    data,
    error: null,
    alreadyExists: false,
  }
}

/**
 * Adds a user to an institution with a specified role.
 * Returns existing membership if user is already a member.
 */
export async function addUserToInstitution(
  supabase: SupabaseClientType,
  userId: string,
  institutionId: string,
  role: 'admin' | 'teacher' | 'ta' | 'student'
): Promise<SeedResult<Database['public']['Tables']['institution_members']['Row']>> {
  // Check if membership already exists
  const { data: existing, error: checkError } = await supabase
    .from('institution_members')
    .select('*')
    .eq('user_id', userId)
    .eq('institution_id', institutionId)
    .single()

  if (existing) {
    // Update role if different
    if (existing.role !== role) {
      const { data: updated, error: updateError } = await supabase
        .from('institution_members')
        .update({ role })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        return {
          data: null,
          error: `Error updating membership role: ${updateError.message}`,
          alreadyExists: true,
        }
      }

      return {
        data: updated,
        error: null,
        alreadyExists: true,
      }
    }

    return {
      data: existing,
      error: null,
      alreadyExists: true,
    }
  }

  // Only create if not found (ignore PGRST116 "not found" error)
  if (checkError && checkError.code !== 'PGRST116') {
    return {
      data: null,
      error: `Error checking for existing membership: ${checkError.message}`,
      alreadyExists: false,
    }
  }

  // Create new membership
  const { data, error } = await supabase
    .from('institution_members')
    .insert({
      user_id: userId,
      institution_id: institutionId,
      role,
    })
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: `Error creating membership: ${error.message}`,
      alreadyExists: false,
    }
  }

  return {
    data,
    error: null,
    alreadyExists: false,
  }
}

/**
 * Enrolls a user in a course with a specified role.
 * Returns existing enrollment if user is already enrolled.
 */
export async function enrollUserInCourse(
  supabase: SupabaseClientType,
  userId: string,
  courseId: string,
  role: 'teacher' | 'ta' | 'student'
): Promise<SeedResult<Database['public']['Tables']['enrollments']['Row']>> {
  // Check if enrollment already exists
  const { data: existing, error: checkError } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()

  if (existing) {
    // Update role if different
    if (existing.role !== role) {
      const { data: updated, error: updateError } = await supabase
        .from('enrollments')
        .update({ role })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        return {
          data: null,
          error: `Error updating enrollment role: ${updateError.message}`,
          alreadyExists: true,
        }
      }

      return {
        data: updated,
        error: null,
        alreadyExists: true,
      }
    }

    return {
      data: existing,
      error: null,
      alreadyExists: true,
    }
  }

  // Only create if not found (ignore PGRST116 "not found" error)
  if (checkError && checkError.code !== 'PGRST116') {
    return {
      data: null,
      error: `Error checking for existing enrollment: ${checkError.message}`,
      alreadyExists: false,
    }
  }

  // Create new enrollment
  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      user_id: userId,
      course_id: courseId,
      role,
    })
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: `Error creating enrollment: ${error.message}`,
      alreadyExists: false,
    }
  }

  return {
    data,
    error: null,
    alreadyExists: false,
  }
}

/**
 * Creates a student tutor record for a user.
 * Returns existing record if one already exists.
 */
export async function createStudentTutor(
  supabase: SupabaseClientType,
  userId: string,
  institutionId: string
): Promise<SeedResult<Database['public']['Tables']['student_tutors']['Row']>> {
  // Check if tutor record already exists
  const { data: existing, error: checkError } = await supabase
    .from('student_tutors')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existing) {
    return {
      data: existing,
      error: null,
      alreadyExists: true,
    }
  }

  // Only create if not found (ignore PGRST116 "not found" error)
  if (checkError && checkError.code !== 'PGRST116') {
    return {
      data: null,
      error: `Error checking for existing student tutor: ${checkError.message}`,
      alreadyExists: false,
    }
  }

  // Create new student tutor record
  const agentMdPath = `agents/students/${userId}/agent.md`
  const { data, error } = await supabase
    .from('student_tutors')
    .insert({
      user_id: userId,
      institution_id: institutionId,
      agent_md_path: agentMdPath,
    })
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: `Error creating student tutor: ${error.message}`,
      alreadyExists: false,
    }
  }

  return {
    data,
    error: null,
    alreadyExists: false,
  }
}

/**
 * Creates a teacher assistant record for a user.
 * Returns existing record if one already exists.
 */
export async function createTeacherAssistant(
  supabase: SupabaseClientType,
  userId: string,
  institutionId: string
): Promise<SeedResult<Database['public']['Tables']['teacher_assistants']['Row']>> {
  // Check if assistant record already exists
  const { data: existing, error: checkError } = await supabase
    .from('teacher_assistants')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existing) {
    return {
      data: existing,
      error: null,
      alreadyExists: true,
    }
  }

  // Only create if not found (ignore PGRST116 "not found" error)
  if (checkError && checkError.code !== 'PGRST116') {
    return {
      data: null,
      error: `Error checking for existing teacher assistant: ${checkError.message}`,
      alreadyExists: false,
    }
  }

  // Create new teacher assistant record
  const agentMdPath = `agents/teachers/${userId}/agent.md`
  const { data, error } = await supabase
    .from('teacher_assistants')
    .insert({
      user_id: userId,
      institution_id: institutionId,
      agent_md_path: agentMdPath,
    })
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: `Error creating teacher assistant: ${error.message}`,
      alreadyExists: false,
    }
  }

  return {
    data,
    error: null,
    alreadyExists: false,
  }
}

/**
 * Seeds a sample announcement for a course.
 * Returns existing announcement if title already exists for the course.
 */
export async function seedAnnouncement(
  supabase: SupabaseClientType,
  courseId: string,
  authorId: string,
  title: string,
  content: string,
  pinned: boolean = false
): Promise<SeedResult<Database['public']['Tables']['announcements']['Row']>> {
  // Check if announcement already exists
  const { data: existing, error: checkError } = await supabase
    .from('announcements')
    .select('*')
    .eq('course_id', courseId)
    .eq('title', title)
    .single()

  if (existing) {
    return {
      data: existing,
      error: null,
      alreadyExists: true,
    }
  }

  // Only create if not found (ignore PGRST116 "not found" error)
  if (checkError && checkError.code !== 'PGRST116') {
    return {
      data: null,
      error: `Error checking for existing announcement: ${checkError.message}`,
      alreadyExists: false,
    }
  }

  // Create new announcement
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      course_id: courseId,
      author_id: authorId,
      title,
      content,
      pinned,
      publish_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: `Error creating announcement: ${error.message}`,
      alreadyExists: false,
    }
  }

  return {
    data,
    error: null,
    alreadyExists: false,
  }
}
