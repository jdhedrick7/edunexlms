export interface TestData {
  institutionId: string
  institutionName: string
  courseId: string
  courseName: string
  courseCode: string
  users: {
    admin: { id: string; email: string }
    teacher: { id: string; email: string }
    ta: { id: string; email: string }
    student: { id: string; email: string }
    student2: { id: string; email: string }
  }
}

/**
 * Returns the known test data IDs.
 * These match the seeded data in the Supabase database.
 */
export function loadTestData(): TestData {
  return {
    institutionId: 'a0000001-0000-0000-0000-000000000010',
    institutionName: 'EduNex Test',
    courseId: 'b0c3d5f0-cf95-4697-ac0f-0336e0ef2105',
    courseName: 'Test',
    courseCode: 'TEST101',
    users: {
      admin: { id: 'a0000001-0000-0000-0000-000000000001', email: 'admin@edunexlms.com' },
      teacher: { id: 'a0000001-0000-0000-0000-000000000002', email: 'teacher@edunexlms.com' },
      ta: { id: 'a0000001-0000-0000-0000-000000000004', email: 'ta@edunexlms.com' },
      student: { id: 'a0000001-0000-0000-0000-000000000003', email: 'student@edunexlms.com' },
      student2: { id: 'a0000001-0000-0000-0000-000000000005', email: 'student2@edunexlms.com' },
    },
  }
}
