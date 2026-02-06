import { test, expect } from '../fixtures/auth.fixture'
import { loadTestData } from '../fixtures/test-data'
import { TEST_USERS } from '../helpers/test-users'

const testData = loadTestData()

test.describe('Admin User Management', () => {
  test('admin can navigate to /admin/users and see the users list', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/users')

    // Verify page heading is visible
    await expect(
      adminPage.getByRole('heading', { name: 'User Management' })
    ).toBeVisible()

    // Verify the subheading text
    await expect(
      adminPage.getByText('Manage users in your institution')
    ).toBeVisible()

    // The "Add User" card should be visible (CardTitle + submit button both have this text)
    await expect(
      adminPage.locator('[data-slot="card-title"]').filter({ hasText: 'Add User' })
    ).toBeVisible()

    // The members table card should be visible
    await expect(
      adminPage.locator('[data-slot="card-title"]').filter({ hasText: 'Institution Members' })
    ).toBeVisible()

    // The table should have the expected column headers
    await expect(adminPage.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    await expect(adminPage.getByRole('columnheader', { name: 'Email' })).toBeVisible()
    await expect(adminPage.getByRole('columnheader', { name: 'Role' })).toBeVisible()
    await expect(adminPage.getByRole('columnheader', { name: 'Joined' })).toBeVisible()
    await expect(adminPage.getByRole('columnheader', { name: 'Actions' })).toBeVisible()
  })

  test('admin can see existing test users in the list', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/users')

    // Wait for loading to complete (the table should appear)
    await expect(
      adminPage.locator('[data-slot="card-title"]').filter({ hasText: 'Institution Members' })
    ).toBeVisible()

    // Wait for loading text to disappear
    await expect(adminPage.getByText('Loading users...')).not.toBeVisible({
      timeout: 15000,
    })

    // Verify the total members count is displayed and is > 0
    const description = adminPage.getByText(/total members/)
    await expect(description).toBeVisible()

    // Verify test user emails appear in the table
    await expect(
      adminPage.getByRole('cell', { name: TEST_USERS.admin.email })
    ).toBeVisible()

    await expect(
      adminPage.getByRole('cell', { name: TEST_USERS.teacher.email })
    ).toBeVisible()

    await expect(
      adminPage.getByRole('cell', { name: TEST_USERS.student.email })
    ).toBeVisible()

    // Verify test user full names appear in the table
    await expect(
      adminPage.getByRole('cell', { name: TEST_USERS.admin.fullName })
    ).toBeVisible()

    await expect(
      adminPage.getByRole('cell', { name: TEST_USERS.teacher.fullName })
    ).toBeVisible()

    // Verify role badges are visible (at least admin and teacher)
    // Use locator targeting the badge div specifically to avoid matching name/email cells
    const adminBadge = adminPage.getByRole('row').filter({ hasText: TEST_USERS.admin.email }).locator('div.inline-flex').filter({ hasText: 'admin' })
    await expect(adminBadge).toBeVisible()

    const teacherBadge = adminPage.getByRole('row').filter({ hasText: TEST_USERS.teacher.email }).locator('div.inline-flex').filter({ hasText: 'teacher' })
    await expect(teacherBadge).toBeVisible()
  })

  test('student cannot access /admin/users and gets redirected', async ({
    studentPage,
  }) => {
    await studentPage.goto('/admin/users')

    // The student should be redirected away from the admin users page.
    // The client-side check redirects non-admins to /dashboard.
    // The server-side admin page also redirects non-admins to /dashboard.
    await studentPage.waitForURL('**/dashboard', { timeout: 15000 })

    // Verify the student is NOT seeing the admin user management page
    await expect(
      studentPage.getByRole('heading', { name: 'User Management' })
    ).not.toBeVisible()
  })

  test('admin can verify all test users have correct roles in the UI', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/users')

    // Wait for loading to complete
    await expect(adminPage.getByText('Loading users...')).not.toBeVisible({
      timeout: 15000,
    })

    // Verify TA user appears with correct role
    await expect(
      adminPage.getByRole('cell', { name: TEST_USERS.ta.email })
    ).toBeVisible()
    const taBadge = adminPage.getByRole('row').filter({ hasText: TEST_USERS.ta.email }).locator('div.inline-flex').filter({ hasText: 'ta' })
    await expect(taBadge).toBeVisible()

    // Verify student user appears with correct role
    const studentBadge = adminPage.getByRole('row').filter({ hasText: TEST_USERS.student.email }).locator('div.inline-flex').filter({ hasText: 'student' })
    await expect(studentBadge).toBeVisible()

    // Verify student2 user appears with correct role
    await expect(
      adminPage.getByRole('cell', { name: TEST_USERS.student2.email })
    ).toBeVisible()
    const student2Badge = adminPage.getByRole('row').filter({ hasText: TEST_USERS.student2.email }).locator('div.inline-flex').filter({ hasText: 'student' })
    await expect(student2Badge).toBeVisible()
  })
})
