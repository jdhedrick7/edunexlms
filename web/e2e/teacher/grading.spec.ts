import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Teacher grading pages', () => {
  test.describe('Gradebook page', () => {
    test('teacher can navigate to the gradebook page', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/gradebook`)
      await expect(teacherPage.getByRole('heading', { name: 'Gradebook' })).toBeVisible({ timeout: 15000 })

      // Verify the URL structure is correct
      expect(teacherPage.url()).toContain(`/courses/${testData.courseId}/gradebook`)

      // The gradebook page shows its heading
      await expect(
        teacherPage.getByRole('heading', { name: 'Gradebook' })
      ).toBeVisible()
    })

    test('gradebook shows course code and name', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/gradebook`)
      await expect(teacherPage.getByRole('heading', { name: 'Gradebook' })).toBeVisible({ timeout: 15000 })

      // The page subtitle shows course code and name
      await expect(teacherPage.getByText(testData.courseCode)).toBeVisible()
    })

    test('gradebook displays statistics cards', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/gradebook`)
      await expect(teacherPage.getByRole('heading', { name: 'Gradebook' })).toBeVisible({ timeout: 15000 })

      // Statistics cards are visible
      await expect(teacherPage.getByText('Students', { exact: true })).toBeVisible()
      await expect(teacherPage.getByText('Class Average')).toBeVisible()
      await expect(teacherPage.getByText('Assignments')).toBeVisible()
      await expect(teacherPage.getByText('Pending Grades')).toBeVisible()
    })

    test('gradebook shows "Student Grades" section', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/gradebook`)
      await expect(teacherPage.getByRole('heading', { name: 'Gradebook' })).toBeVisible({ timeout: 15000 })

      await expect(
        teacherPage.getByText('Student Grades', { exact: true })
      ).toBeVisible()
    })

    test('gradebook has a "Back to Course" link', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/gradebook`)
      await expect(teacherPage.getByRole('heading', { name: 'Gradebook' })).toBeVisible({ timeout: 15000 })

      const backLink = teacherPage.getByRole('link', { name: /Back to Course/ })
      await expect(backLink).toBeVisible()

      // Verify it points back to the course
      await expect(backLink).toHaveAttribute('href', `/courses/${testData.courseId}`)
    })

    test('student is redirected away from gradebook page', async ({ studentPage }) => {
      await studentPage.goto(`/courses/${testData.courseId}/gradebook`)

      // Students get redirected from /gradebook to /grades (student-facing)
      await studentPage.waitForURL(`**/courses/${testData.courseId}/grades`, { timeout: 15000 })
      expect(studentPage.url()).not.toContain('/gradebook')
    })
  })

  test.describe('Submissions page', () => {
    test('teacher can navigate to the submissions page', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/submissions`)
      await expect(teacherPage.getByRole('heading', { name: 'Submissions' })).toBeVisible({ timeout: 15000 })

      // Verify the URL
      expect(teacherPage.url()).toContain(`/courses/${testData.courseId}/submissions`)

      // The submissions page shows its heading
      await expect(
        teacherPage.getByRole('heading', { name: 'Submissions' })
      ).toBeVisible()
    })

    test('submissions page shows course code and name', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/submissions`)
      await expect(teacherPage.getByRole('heading', { name: 'Submissions' })).toBeVisible({ timeout: 15000 })

      await expect(teacherPage.getByText(testData.courseCode)).toBeVisible()
    })

    test('submissions page displays statistics cards', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/submissions`)
      await expect(teacherPage.getByRole('heading', { name: 'Submissions' })).toBeVisible({ timeout: 15000 })

      // Statistics cards
      await expect(teacherPage.getByText('Total Submissions')).toBeVisible()
      await expect(teacherPage.getByText('Pending Review')).toBeVisible()
      await expect(teacherPage.getByText('Graded')).toBeVisible()
    })

    test('submissions page shows "All Submissions" section', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/submissions`)
      await expect(teacherPage.getByRole('heading', { name: 'Submissions' })).toBeVisible({ timeout: 15000 })

      await expect(
        teacherPage.getByText('All Submissions', { exact: true })
      ).toBeVisible()
    })

    test('submissions page has a "Back to Course" link', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}/submissions`)
      await expect(teacherPage.getByRole('heading', { name: 'Submissions' })).toBeVisible({ timeout: 15000 })

      const backLink = teacherPage.getByRole('link', { name: /Back to Course/ })
      await expect(backLink).toBeVisible()
      await expect(backLink).toHaveAttribute('href', `/courses/${testData.courseId}`)
    })

    test('student is redirected away from submissions page', async ({ studentPage }) => {
      await studentPage.goto(`/courses/${testData.courseId}/submissions`)
      await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

      // Students should be redirected away from the submissions page
      expect(studentPage.url()).not.toContain('/submissions')
    })
  })

  test.describe('Inline grading tabs on course page', () => {
    test('teacher can access Gradebook tab from course page', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}`)
      await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

      // Click the Gradebook tab
      await teacherPage.getByRole('button', { name: 'Gradebook' }).click()

      // The inline gradebook tab shows a heading and a link to the full gradebook
      await expect(
        teacherPage.getByRole('heading', { name: 'Gradebook' })
      ).toBeVisible()
      await expect(
        teacherPage.getByRole('link', { name: 'Open Full Gradebook' })
      ).toBeVisible()
    })

    test('teacher can access Submissions tab from course page', async ({ teacherPage }) => {
      await teacherPage.goto(`/courses/${testData.courseId}`)
      await expect(teacherPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible({ timeout: 15000 })

      // Click the Submissions tab
      await teacherPage.getByRole('button', { name: 'Submissions' }).click()

      // The inline submissions tab shows a heading
      await expect(
        teacherPage.getByRole('heading', { name: 'Submissions' })
      ).toBeVisible()
    })
  })
})
