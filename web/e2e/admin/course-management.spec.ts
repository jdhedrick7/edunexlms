import { test, expect } from '../fixtures/auth.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Admin Course Management', () => {
  test('admin can navigate to /admin/courses and see courses list', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/courses')

    // Verify page heading
    await expect(
      adminPage.getByRole('heading', { name: 'Course Management' })
    ).toBeVisible()

    // Verify subheading text
    await expect(
      adminPage.getByText('Create and manage courses in your institution')
    ).toBeVisible()

    // The "Create Course" button should be visible
    await expect(
      adminPage.getByRole('button', { name: 'Create Course' })
    ).toBeVisible()

    // The courses table card should be visible
    await expect(
      adminPage.getByText('Courses', { exact: true }).first()
    ).toBeVisible()

    // Wait for loading to complete
    await expect(adminPage.getByText('Loading courses...')).not.toBeVisible({
      timeout: 15000,
    })

    // Verify table column headers
    await expect(
      adminPage.getByRole('columnheader', { name: 'Code' })
    ).toBeVisible()
    await expect(
      adminPage.getByRole('columnheader', { name: 'Name' })
    ).toBeVisible()
    await expect(
      adminPage.getByRole('columnheader', { name: 'Teachers' })
    ).toBeVisible()
    await expect(
      adminPage.getByRole('columnheader', { name: 'Students' })
    ).toBeVisible()
    await expect(
      adminPage.getByRole('columnheader', { name: 'Actions' })
    ).toBeVisible()
  })

  test('admin can see the E2E test course in the list', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/courses')

    // Wait for loading to complete
    await expect(adminPage.getByText('Loading courses...')).not.toBeVisible({
      timeout: 15000,
    })

    // Verify the test course code is visible in the table
    await expect(
      adminPage.getByText(testData.courseCode)
    ).toBeVisible()

    // Verify the test course name is visible in the table
    await expect(
      adminPage.getByRole('cell', { name: testData.courseName }).first()
    ).toBeVisible()

    // Verify total courses count is displayed
    const description = adminPage.getByText(/total courses/)
    await expect(description).toBeVisible()
  })

  test('admin can create a new course', async ({
    adminPage,
  }) => {

    const timestamp = Date.now()
    const newCourseCode = `E2E${timestamp}`.slice(0, 20)
    const newCourseName = `E2E Test Course ${timestamp}`

    await adminPage.goto('/admin/courses')

    // Wait for the page to load
    await expect(adminPage.getByText('Loading courses...')).not.toBeVisible({
      timeout: 15000,
    })

    // Click the "Create Course" button to open the dialog
    await adminPage.getByRole('button', { name: 'Create Course' }).click()

    // Verify the dialog opens
    await expect(
      adminPage.getByRole('heading', { name: 'Create New Course' })
    ).toBeVisible()

    // Fill in the course form
    await adminPage.getByLabel('Course Code').fill(newCourseCode)
    await adminPage.getByLabel('Course Name').fill(newCourseName)
    await adminPage.getByLabel('Description (Optional)').fill(
      'Automated E2E test course - safe to delete'
    )

    // Submit the form by clicking "Create Course" button inside the dialog
    await adminPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Create Course' })
      .click()

    // Wait for dialog to close (indicates success) - allow extra time for API
    await expect(
      adminPage.getByRole('dialog')
    ).not.toBeVisible({ timeout: 30000 })

    // Verify the new course appears in the list
    // The code gets uppercased by the API
    await expect(
      adminPage.getByText(newCourseCode.toUpperCase())
    ).toBeVisible({ timeout: 10000 })
  })
})
