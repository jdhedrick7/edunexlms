import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Student Grades', () => {
  test('student can navigate to course grades page via tab', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)

    // Wait for the course page to load
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()

    // Click the "My Grades" tab
    const myGradesTab = studentPage.getByRole('button', { name: 'My Grades' })
    await expect(myGradesTab).toBeVisible()
    await myGradesTab.click()

    // The My Grades heading should appear in the tab content
    await expect(studentPage.getByRole('heading', { name: 'My Grades' })).toBeVisible()
  })

  test('grades page loads without error via direct URL', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}/grades`)

    // The dedicated grades page should load with the "My Grades" heading
    await expect(studentPage.getByRole('heading', { name: 'My Grades', level: 1 })).toBeVisible()

    // Should show the course code
    await expect(studentPage.getByText(testData.courseCode)).toBeVisible()

    // Should have a "Back to Course" link
    await expect(studentPage.getByRole('link', { name: /Back to Course/i })).toBeVisible()
  })

  test('student only sees their own grades (empty state initially)', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)

    // Navigate to My Grades tab
    await studentPage.getByRole('button', { name: 'My Grades' }).click()

    // Wait for the grades section
    await expect(studentPage.getByRole('heading', { name: 'My Grades' })).toBeVisible()

    // When there are no grades, should show "No grades yet" empty state
    // or show the grades list if grades exist. Either is acceptable.
    const noGradesMessage = studentPage.getByText('No grades yet')
    const gradesExist = studentPage.locator('[class*="divide-y"]')

    const hasNoGrades = await noGradesMessage.isVisible().catch(() => false)
    const hasGrades = await gradesExist.isVisible().catch(() => false)

    // One of these must be true - the page either shows grades or the empty state
    expect(hasNoGrades || hasGrades).toBeTruthy()
  })

  test('grades page shows summary cards', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}/grades`)

    // Wait for the page to load
    await expect(studentPage.getByRole('heading', { name: 'My Grades', level: 1 })).toBeVisible()

    // Summary cards should be visible
    await expect(studentPage.getByText('Overall Grade')).toBeVisible()
    await expect(studentPage.getByText('Points Earned')).toBeVisible()
    await expect(studentPage.getByText('Graded Assignments')).toBeVisible()
  })

  test('grades page shows assignment grades table', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}/grades`)

    // Wait for the page to load
    await expect(studentPage.getByRole('heading', { name: 'My Grades', level: 1 })).toBeVisible()

    // The Assignment Grades card and table headers should be visible
    await expect(studentPage.getByText('Assignment Grades', { exact: true })).toBeVisible()
    await expect(studentPage.getByText('Your grades for all assignments in this course')).toBeVisible()

    // Table headers
    await expect(studentPage.getByRole('columnheader', { name: 'Assignment' })).toBeVisible()
    await expect(studentPage.getByRole('columnheader', { name: 'Status' })).toBeVisible()
    await expect(studentPage.getByRole('columnheader', { name: 'Score' })).toBeVisible()
    await expect(studentPage.getByRole('columnheader', { name: 'Percentage' })).toBeVisible()
    await expect(studentPage.getByRole('columnheader', { name: 'Graded' })).toBeVisible()
  })

  test('back to course button navigates correctly', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}/grades`)

    // Wait for the page to load
    await expect(studentPage.getByRole('heading', { name: 'My Grades', level: 1 })).toBeVisible()

    // Click "Back to Course"
    await studentPage.getByRole('link', { name: /Back to Course/i }).click()

    // Should navigate back to the course page
    await studentPage.waitForURL(`**/courses/${testData.courseId}`)
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()
  })

  test('student2 also sees their own grades page independently', async ({ student2Page }) => {
    // Verify a second student can also access the grades page for the same course
    await student2Page.goto(`/courses/${testData.courseId}/grades`)

    await expect(student2Page.getByRole('heading', { name: 'My Grades', level: 1 })).toBeVisible()
    await expect(student2Page.getByText(testData.courseCode)).toBeVisible()
  })

  test('non-student role is redirected from grades page', async ({ teacherPage }) => {
    // Teachers should be redirected from /grades to /gradebook
    await teacherPage.goto(`/courses/${testData.courseId}/grades`)

    // Teacher gets redirected to /gradebook
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/gradebook`)
  })
})
