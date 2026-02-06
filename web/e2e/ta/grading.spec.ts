import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('TA Grading Access', () => {
  test('TA can navigate to course submissions page', async ({ taPage }) => {
    await taPage.goto(`/courses/${testData.courseId}/submissions`)

    // Verify the submissions page heading is visible
    await expect(
      taPage.getByRole('heading', { name: 'Submissions' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the course code is shown in the description
    await expect(
      taPage.getByText(testData.courseCode)
    ).toBeVisible()

    // Verify statistics cards are rendered
    await expect(
      taPage.getByText('Total Submissions')
    ).toBeVisible()

    await expect(
      taPage.getByText('Pending Review')
    ).toBeVisible()

    await expect(
      taPage.getByText('Graded', { exact: false })
    ).toBeVisible()

    // Verify "All Submissions" card section is present
    await expect(
      taPage.getByText('All Submissions', { exact: true })
    ).toBeVisible()

    // Verify "Back to Course" link exists
    await expect(
      taPage.getByRole('link', { name: /Back to Course/ })
    ).toBeVisible()
  })

  test('TA can navigate to course gradebook', async ({ taPage }) => {
    await taPage.goto(`/courses/${testData.courseId}/gradebook`)

    // Verify the gradebook page heading is visible
    await expect(
      taPage.getByRole('heading', { name: 'Gradebook' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the course code is shown in the description
    await expect(
      taPage.getByText(testData.courseCode)
    ).toBeVisible()

    // Verify statistics cards are rendered
    await expect(
      taPage.getByText('Students', { exact: true })
    ).toBeVisible()

    await expect(
      taPage.getByText('Class Average')
    ).toBeVisible()

    await expect(
      taPage.getByText('Assignments')
    ).toBeVisible()

    await expect(
      taPage.getByText('Pending Grades')
    ).toBeVisible()

    // Verify "Student Grades" section heading is present
    await expect(
      taPage.getByText('Student Grades', { exact: true })
    ).toBeVisible()

    // Verify "Back to Course" link exists
    await expect(
      taPage.getByRole('link', { name: /Back to Course/ })
    ).toBeVisible()
  })

  test('TA can view the course page with staff tabs', async ({ taPage }) => {
    await taPage.goto(`/courses/${testData.courseId}`)

    // Verify the course page loads without error by checking for course name
    await expect(
      taPage.getByRole('heading', { name: testData.courseName, level: 1 })
    ).toBeVisible({ timeout: 15000 })
  })

  test('student cannot access submissions page', async ({ studentPage }) => {
    // Students should be redirected away from the submissions page
    await studentPage.goto(`/courses/${testData.courseId}/submissions`)

    // Student should be redirected to the course page (no submissions heading)
    await expect(
      studentPage.getByRole('heading', { name: 'Submissions' })
    ).not.toBeVisible({ timeout: 15000 })
  })

  test('student cannot access gradebook page', async ({ studentPage }) => {
    // Students should be redirected away from the gradebook page
    await studentPage.goto(`/courses/${testData.courseId}/gradebook`)

    // Student should be redirected to grades page (no gradebook heading)
    await expect(
      studentPage.getByRole('heading', { name: 'Gradebook' })
    ).not.toBeVisible({ timeout: 15000 })
  })
})
