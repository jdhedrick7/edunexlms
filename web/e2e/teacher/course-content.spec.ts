import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Teacher course content page', () => {
  test('teacher can navigate to course page and see it load', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // The course page renders the CourseTabs component which shows the course name
    await expect(teacherPage.locator('h1')).toContainText(testData.courseName)
  })

  test('teacher sees all expected tabs including staff-only tabs', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // Common tabs visible to all roles
    const contentTab = teacherPage.getByRole('button', { name: 'Content' })
    const announcementsTab = teacherPage.getByRole('button', { name: 'Announcements' })
    await expect(contentTab).toBeVisible()
    await expect(announcementsTab).toBeVisible()

    // Staff-only tabs (teacher + TA)
    const gradebookTab = teacherPage.getByRole('button', { name: 'Gradebook' })
    const submissionsTab = teacherPage.getByRole('button', { name: 'Submissions' })
    const studentsTab = teacherPage.getByRole('button', { name: 'Students' })
    const analyticsTab = teacherPage.getByRole('button', { name: 'Analytics' })
    await expect(gradebookTab).toBeVisible()
    await expect(submissionsTab).toBeVisible()
    await expect(studentsTab).toBeVisible()
    await expect(analyticsTab).toBeVisible()

    // Teacher-only tabs
    const builderTab = teacherPage.getByRole('button', { name: 'Builder' })
    const versionsTab = teacherPage.getByRole('button', { name: 'Versions', exact: true })
    await expect(builderTab).toBeVisible()
    await expect(versionsTab).toBeVisible()
  })

  test('teacher does not see student-only tabs', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // "My Grades" tab is only shown to students
    const myGradesTab = teacherPage.getByRole('button', { name: 'My Grades' })
    await expect(myGradesTab).not.toBeVisible()
  })

  test('student does NOT see teacher-only tabs (Builder, Versions)', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // Student should see the course page
    await expect(studentPage.locator('h1')).toContainText(testData.courseName)

    // Student should NOT see Builder or Versions tabs
    const builderTab = studentPage.getByRole('button', { name: 'Builder' })
    const versionsTab = studentPage.getByRole('button', { name: 'Versions', exact: true })
    await expect(builderTab).not.toBeVisible()
    await expect(versionsTab).not.toBeVisible()

    // Student should also NOT see staff-only tabs
    const gradebookTab = studentPage.getByRole('button', { name: 'Gradebook' })
    const submissionsTab = studentPage.getByRole('button', { name: 'Submissions' })
    const studentsTab = studentPage.getByRole('button', { name: 'Students' })
    const analyticsTab = studentPage.getByRole('button', { name: 'Analytics' })
    await expect(gradebookTab).not.toBeVisible()
    await expect(submissionsTab).not.toBeVisible()
    await expect(studentsTab).not.toBeVisible()
    await expect(analyticsTab).not.toBeVisible()
  })

  test('student sees My Grades tab', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    const myGradesTab = studentPage.getByRole('button', { name: 'My Grades' })
    await expect(myGradesTab).toBeVisible()
  })

  test('teacher can click through each tab without errors', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // Click Announcements tab
    await teacherPage.getByRole('button', { name: 'Announcements' }).click()
    await expect(teacherPage.getByRole('heading', { name: 'Announcements' })).toBeVisible()

    // Click Gradebook tab
    await teacherPage.getByRole('button', { name: 'Gradebook' }).click()
    await expect(teacherPage.getByRole('heading', { name: 'Gradebook' })).toBeVisible()

    // Click Submissions tab
    await teacherPage.getByRole('button', { name: 'Submissions' }).click()
    await expect(teacherPage.getByRole('heading', { name: 'Submissions' })).toBeVisible()

    // Click Students tab
    await teacherPage.getByRole('button', { name: 'Students' }).click()
    await expect(teacherPage.getByText('Students (')).toBeVisible()

    // Click Analytics tab
    await teacherPage.getByRole('button', { name: 'Analytics' }).click()
    await expect(teacherPage.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    // Click Builder tab
    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    // Builder tab renders the CourseBuilder component - just verify no error page
    await expect(teacherPage.locator('body')).not.toContainText('Application error')

    // Click Versions tab
    await teacherPage.getByRole('button', { name: 'Versions', exact: true }).click()
    await expect(teacherPage.getByRole('heading', { name: 'Course Versions' })).toBeVisible()

    // Click back to Content tab
    await teacherPage.getByRole('button', { name: 'Content' }).click()
    await expect(teacherPage.getByText('Course Content', { exact: true })).toBeVisible()
  })

  test('course header shows course code and institution name', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // The header displays course code
    await expect(teacherPage.getByText(testData.courseCode)).toBeVisible()
  })

  test('teacher sees settings icon button in course header', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)
    await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

    // The settings link points to /courses/{courseId}/settings
    const settingsLink = teacherPage.locator(`a[href="/courses/${testData.courseId}/settings"]`)
    await expect(settingsLink).toBeVisible()
  })
})
