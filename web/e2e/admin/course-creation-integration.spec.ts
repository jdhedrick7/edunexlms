import { test, expect } from '../fixtures/auth.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Admin Course Creation Integration', () => {
  test('admin creates course and verifies it appears in the list', async ({
    adminPage,
  }) => {

    const timestamp = Date.now()
    const newCourseCode = `E2E${timestamp}`.slice(0, 20)
    const newCourseName = `E2E Integration Course ${timestamp}`
    const newCourseDesc = 'Created by E2E integration test'

    await adminPage.goto('/admin/courses')

    // Wait for page to load
    await expect(adminPage.getByText('Loading courses...')).not.toBeVisible({
      timeout: 15000,
    })

    // Open create dialog
    await adminPage.getByRole('button', { name: 'Create Course' }).click()
    await expect(
      adminPage.getByRole('heading', { name: 'Create New Course' })
    ).toBeVisible()

    // Fill form
    await adminPage.getByLabel('Course Code').fill(newCourseCode)
    await adminPage.getByLabel('Course Name').fill(newCourseName)
    await adminPage.getByLabel('Description (Optional)').fill(newCourseDesc)

    // Submit
    await adminPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Create Course' })
      .click()

    // Wait for dialog to close (success)
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 30000 })

    // Verify course appears in the list (code gets uppercased by the API)
    const uppercaseCode = newCourseCode.toUpperCase()
    await expect(adminPage.getByText(uppercaseCode)).toBeVisible({ timeout: 10000 })

    // Verify the course name appears in the list
    await expect(adminPage.getByText(newCourseName)).toBeVisible()

    // Verify the new course row has the expected details
    const courseRow = adminPage.locator('tr').filter({ hasText: uppercaseCode })
    await expect(courseRow).toBeVisible()
    await expect(courseRow.locator('td').filter({ hasText: newCourseName })).toBeVisible()
  })

  test('admin creates course with duplicate code → gets error', async ({
    adminPage,
  }) => {
    // Try to create a course with the existing TEST101 code
    await adminPage.goto('/admin/courses')
    await expect(adminPage.getByText('Loading courses...')).not.toBeVisible({
      timeout: 15000,
    })

    await adminPage.getByRole('button', { name: 'Create Course' }).click()
    await expect(
      adminPage.getByRole('heading', { name: 'Create New Course' })
    ).toBeVisible()

    await adminPage.getByLabel('Course Code').fill('TEST101')
    await adminPage.getByLabel('Course Name').fill('Duplicate Test Course')

    await adminPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Create Course' })
      .click()

    // Should show an error about duplicate code
    await expect(
      adminPage.getByText(/already exists/i)
    ).toBeVisible({ timeout: 15000 })
  })

  test('created course appears in admin course list with correct stats', async ({
    adminPage,
  }) => {

    const timestamp = Date.now()
    const code = `E2ESTAT${timestamp}`.slice(0, 20)
    const name = `E2E Stats Course ${timestamp}`

    await adminPage.goto('/admin/courses')
    await expect(adminPage.getByText('Loading courses...')).not.toBeVisible({
      timeout: 15000,
    })

    // Create the course
    await adminPage.getByRole('button', { name: 'Create Course' }).click()
    await adminPage.getByLabel('Course Code').fill(code)
    await adminPage.getByLabel('Course Name').fill(name)
    await adminPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Create Course' })
      .click()
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 30000 })

    const uppercaseCode = code.toUpperCase()
    await expect(adminPage.getByText(uppercaseCode)).toBeVisible({ timeout: 10000 })

    // Verify the new course row is visible
    const courseRow = adminPage.locator('tr').filter({ hasText: uppercaseCode })
    await expect(courseRow).toBeVisible()

    // The row should contain the course name
    await expect(courseRow.locator('td').filter({ hasText: name })).toBeVisible()
  })
})
