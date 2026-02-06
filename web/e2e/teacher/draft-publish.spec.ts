import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Teacher draft and publish workflow', () => {
  test('teacher can navigate to the Versions tab on the course page', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // Click the Versions tab
    await teacherPage.getByRole('button', { name: 'Versions', exact: true }).click()

    // The versions tab shows the "Course Versions" heading
    await expect(
      teacherPage.getByRole('heading', { name: 'Course Versions' })
    ).toBeVisible()
  })

  test('Versions tab loads without error', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    await teacherPage.getByRole('button', { name: 'Versions', exact: true }).click()

    // Should not show application error
    await expect(teacherPage.locator('body')).not.toContainText('Application error')
    await expect(teacherPage.locator('body')).not.toContainText('Internal Server Error')

    // The page should show either versions or the empty state
    const hasVersions = await teacherPage.getByText('Version ').first().isVisible().catch(() => false)
    const hasEmptyState = await teacherPage.getByText('No versions yet').isVisible().catch(() => false)

    expect(hasVersions || hasEmptyState).toBe(true)
  })

  test('Versions tab shows "Upload ZIP" button', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    await teacherPage.getByRole('button', { name: 'Versions', exact: true }).click()

    // The Upload ZIP button is always visible in the versions tab header
    await expect(teacherPage.getByText('Upload ZIP')).toBeVisible()
  })

  test('Builder tab loads for teacher', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // Click the Builder tab
    await teacherPage.getByRole('button', { name: 'Builder' }).click()

    // Should not show errors
    await expect(teacherPage.locator('body')).not.toContainText('Application error')
    await expect(teacherPage.locator('body')).not.toContainText('Internal Server Error')
  })

  test('student cannot see the Versions tab', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    const versionsTab = studentPage.getByRole('button', { name: 'Versions', exact: true })
    await expect(versionsTab).not.toBeVisible()
  })

  test('student cannot see the Builder tab', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    const builderTab = studentPage.getByRole('button', { name: 'Builder' })
    await expect(builderTab).not.toBeVisible()
  })

  test('TA cannot see the Versions tab (teacher-only)', async ({ taPage }) => {
    await taPage.goto(`/courses/${testData.courseId}`)
    await expect(taPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // TAs see staff tabs but NOT teacher-only tabs (Builder, Versions)
    const versionsTab = taPage.getByRole('button', { name: 'Versions', exact: true })
    await expect(versionsTab).not.toBeVisible()
  })

  test('TA cannot see the Builder tab (teacher-only)', async ({ taPage }) => {
    await taPage.goto(`/courses/${testData.courseId}`)
    await expect(taPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    const builderTab = taPage.getByRole('button', { name: 'Builder' })
    await expect(builderTab).not.toBeVisible()
  })
})
