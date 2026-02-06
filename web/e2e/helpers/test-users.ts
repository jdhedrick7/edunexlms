export const TEST_USERS = {
  admin: {
    email: 'admin@edunexlms.com',
    password: 'Test123!',
    fullName: 'Admin User',
    institutionRole: 'admin' as const,
  },
  teacher: {
    email: 'teacher@edunexlms.com',
    password: 'Test123!',
    fullName: 'Test Teacher',
    institutionRole: 'teacher' as const,
    courseRole: 'teacher' as const,
  },
  ta: {
    email: 'ta@edunexlms.com',
    password: 'Test123!',
    fullName: 'Test TA',
    institutionRole: 'ta' as const,
    courseRole: 'ta' as const,
  },
  student: {
    email: 'student@edunexlms.com',
    password: 'Test123!',
    fullName: 'Test Student',
    institutionRole: 'student' as const,
    courseRole: 'student' as const,
  },
  student2: {
    email: 'student2@edunexlms.com',
    password: 'Test123!',
    fullName: 'Test Student 2',
    institutionRole: 'student' as const,
    courseRole: 'student' as const,
  },
} as const

export type TestRole = keyof typeof TEST_USERS
