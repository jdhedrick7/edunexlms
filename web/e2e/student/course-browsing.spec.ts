import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Student Course Browsing', () => {
  test('student sees enrolled courses on dashboard', async ({ studentPage }) => {
    await studentPage.goto('/dashboard')

    // Dashboard should load with the heading
    await expect(studentPage.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    await expect(studentPage.getByText("Welcome back! Here's what's happening in your courses.")).toBeVisible()

    // Stats cards should be visible
    await expect(studentPage.getByText('Enrolled Courses')).toBeVisible()
    await expect(studentPage.getByText('Unread Notifications')).toBeVisible()
    await expect(studentPage.getByText('Recent Announcements').first()).toBeVisible()

    // "My Courses" card should be visible with the course name (CardTitle renders as div)
    await expect(studentPage.getByText('My Courses', { exact: true })).toBeVisible()
    // Course code appears in My Courses section
    await expect(studentPage.getByText(testData.courseCode).first()).toBeVisible()
  })

  test('student can navigate to /courses and see course list', async ({ studentPage }) => {
    await studentPage.goto('/courses')

    // Courses page heading
    await expect(studentPage.getByRole('heading', { name: 'Courses', level: 1 })).toBeVisible()
    await expect(studentPage.getByText('View and manage your courses')).toBeVisible()

    // Student enrollments appear under "Enrolled" section
    await expect(studentPage.getByRole('heading', { name: 'Enrolled' })).toBeVisible()

    // Course card with name and code should be visible
    await expect(studentPage.getByText(testData.courseName, { exact: true }).first()).toBeVisible()
    await expect(studentPage.getByText(testData.courseCode)).toBeVisible()
  })

  test('student can click on a course and see the course detail page', async ({ studentPage }) => {
    await studentPage.goto('/courses')

    // Click on the course card link
    await studentPage.locator(`a[href="/courses/${testData.courseId}"]`).first().click()

    // Should navigate to the course detail page
    await studentPage.waitForURL(`**/courses/${testData.courseId}`)

    // Course detail page renders the CourseTabs component with course info
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()
    await expect(studentPage.getByText(testData.courseCode)).toBeVisible()
  })

  test('student sees limited tabs (Content, Announcements, My Grades) - no staff tabs', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)

    // Wait for the course page to load
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()

    // Student should see these tabs
    const contentTab = studentPage.getByRole('button', { name: 'Content' })
    const announcementsTab = studentPage.getByRole('button', { name: 'Announcements' })
    const myGradesTab = studentPage.getByRole('button', { name: 'My Grades' })

    await expect(contentTab).toBeVisible()
    await expect(announcementsTab).toBeVisible()
    await expect(myGradesTab).toBeVisible()

    // Student should NOT see teacher/staff-only tabs
    await expect(studentPage.getByRole('button', { name: 'Gradebook' })).not.toBeVisible()
    await expect(studentPage.getByRole('button', { name: 'Submissions' })).not.toBeVisible()
    await expect(studentPage.getByRole('button', { name: 'Students' })).not.toBeVisible()
    await expect(studentPage.getByRole('button', { name: 'Analytics' })).not.toBeVisible()
    await expect(studentPage.getByRole('button', { name: 'Builder' })).not.toBeVisible()
    await expect(studentPage.getByRole('button', { name: 'Versions', exact: true })).not.toBeVisible()
  })

  test('student cannot access teacher-only route /gradebook', async ({ studentPage }) => {
    // The grades page for students redirects non-students to /gradebook,
    // but the /gradebook route itself should not be accessible to students.
    // Attempting to navigate to /gradebook should redirect or show an error.
    await studentPage.goto(`/courses/${testData.courseId}/gradebook`)

    // The student should either be redirected away from the gradebook
    // or see an access denied / not found page.
    // Based on the app logic, non-enrolled or unauthorized access results in redirect or 404.
    const currentUrl = studentPage.url()
    const isRedirected = !currentUrl.includes('/gradebook')
    const hasNotFound = await studentPage.getByText('not found', { exact: false }).isVisible().catch(() => false)
    const hasError = await studentPage.getByText('404', { exact: false }).isVisible().catch(() => false)

    expect(isRedirected || hasNotFound || hasError).toBeTruthy()
  })

  test('student can click through tabs on course page', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)

    // Wait for page to load
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()

    // Content tab should be active by default
    const contentTab = studentPage.getByRole('button', { name: 'Content' })
    await expect(contentTab).toBeVisible()

    // Click Announcements tab
    const announcementsTab = studentPage.getByRole('button', { name: 'Announcements' })
    await announcementsTab.click()
    await expect(studentPage.getByRole('heading', { name: 'Announcements' })).toBeVisible()

    // Click My Grades tab
    const myGradesTab = studentPage.getByRole('button', { name: 'My Grades' })
    await myGradesTab.click()
    await expect(studentPage.getByRole('heading', { name: 'My Grades' })).toBeVisible()

    // Switch back to Content tab
    await contentTab.click()
    // Content tab should show course content area
    await expect(studentPage.getByText('Course Content', { exact: true }).first()).toBeVisible()
  })

  test('student does not see staff-only header elements (settings, draft review)', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)

    // Wait for course page to load
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()

    // Student should not see the settings icon/button (only visible to teacher)
    await expect(studentPage.getByRole('button', { name: /settings/i })).not.toBeVisible()

    // Student should not see "Review Draft" button
    await expect(studentPage.getByRole('button', { name: /Review Draft/i })).not.toBeVisible()

    // Student should not see published version info bar
    await expect(studentPage.getByText(/Published: v/)).not.toBeVisible()
  })

  test('dashboard course links navigate to correct course', async ({ studentPage }) => {
    await studentPage.goto('/dashboard')

    // Find the course link in the "My Courses" section and click it
    const courseLink = studentPage.locator(`a[href="/courses/${testData.courseId}"]`).first()
    await expect(courseLink).toBeVisible()
    await courseLink.click()

    // Should land on the correct course page
    await studentPage.waitForURL(`**/courses/${testData.courseId}`)
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()
  })
})
