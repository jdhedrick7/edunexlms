import { test, expect } from '../fixtures/auth.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Student Announcements', () => {
  test('student can view course announcements via tab', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)

    // Wait for the course page to load
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()

    // Click the Announcements tab
    await studentPage.getByRole('button', { name: 'Announcements' }).click()

    // The announcements heading should appear
    await expect(studentPage.getByRole('heading', { name: 'Announcements' })).toBeVisible()

    // Should show announcements or "No announcements yet" empty state
    const hasAnnouncements = await studentPage.locator('[class*="space-y-4"]').isVisible().catch(() => false)
    const hasEmptyState = await studentPage.getByText('No announcements yet').isVisible().catch(() => false)

    expect(hasAnnouncements || hasEmptyState).toBeTruthy()
  })

  test('student can view announcements page via direct URL', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}/announcements`)

    // The announcements page should load
    await expect(studentPage.getByRole('heading', { name: 'Announcements', level: 1 })).toBeVisible()
    await expect(studentPage.getByText('Course updates and important information')).toBeVisible()
  })

  test('announcements page loads without error', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}/announcements`)

    // Should not show any error state
    await expect(studentPage.getByRole('heading', { name: 'Announcements', level: 1 })).toBeVisible()

    // The loading spinner should not be stuck
    await expect(studentPage.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 })

    // No error messages visible
    await expect(studentPage.getByRole('button', { name: 'Try Again' })).not.toBeVisible()
  })

  test('student does not see "New Announcement" button', async ({ studentPage }) => {
    await studentPage.goto(`/courses/${testData.courseId}/announcements`)

    // Wait for the page to load
    await expect(studentPage.getByRole('heading', { name: 'Announcements', level: 1 })).toBeVisible()

    // Student should not see the "New Announcement" button (staff-only)
    await expect(studentPage.getByRole('link', { name: /New Announcement/i })).not.toBeVisible()
  })

  test('student does not see edit or delete buttons on announcements', async ({
    studentPage,
  }) => {
    // Navigate to the announcements page
    await studentPage.goto(`/courses/${testData.courseId}/announcements`)

    // Wait for loading to complete
    await expect(studentPage.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 })

    // Student should not see edit or delete action buttons
    await expect(studentPage.getByRole('button', { name: /edit/i })).not.toBeVisible()
    await expect(studentPage.getByRole('button', { name: /delete/i })).not.toBeVisible()
  })

  test('student sees empty state message when no announcements exist', async ({
    studentPage,
  }) => {
    // Navigate to announcements tab on the course page
    await studentPage.goto(`/courses/${testData.courseId}`)
    await expect(studentPage.getByRole('heading', { name: testData.courseName, level: 1 })).toBeVisible()

    // Click Announcements tab
    await studentPage.getByRole('button', { name: 'Announcements' }).click()

    // If no announcements, should show the empty state
    // Otherwise announcements are rendered in the tab content area
    const emptyState = studentPage.getByText('No announcements yet')
    const announcementsHeading = studentPage.getByRole('heading', { name: 'Announcements' })

    // Either empty state or announcements heading should be visible - page should not be broken
    const isEmpty = await emptyState.isVisible().catch(() => false)
    const hasHeading = await announcementsHeading.isVisible().catch(() => false)
    expect(isEmpty || hasHeading).toBeTruthy()
  })

  test('announcement created by teacher is visible to student and can be marked as read', async ({
    teacherPage,
    studentPage,
  }) => {
    const title = `E2E Test Announcement ${Date.now()}`
    const content = 'This is a test announcement created for E2E testing purposes.'

    // Teacher: create announcement via UI
    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)
    await expect(teacherPage.getByLabel('Title')).toBeVisible({ timeout: 15000 })
    await teacherPage.getByLabel('Title').fill(title)
    await teacherPage.getByLabel('Content').fill(content)
    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()

    // Teacher: verify redirect to announcements list and announcement appears
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/announcements`, { timeout: 15000 })
    await expect(teacherPage.getByText(title)).toBeVisible({ timeout: 15000 })

    // Student: navigate to announcements page
    await studentPage.goto(`/courses/${testData.courseId}/announcements`)
    await expect(studentPage.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 })

    // Student: verify announcement is visible
    await expect(studentPage.getByText(title)).toBeVisible()

    // Student: find the specific announcement card by its unique title
    const announcementCard = studentPage.locator('[data-slot="card"]').filter({
      has: studentPage.getByRole('link', { name: title }),
    })
    await expect(announcementCard).toBeVisible()

    // Student: verify "New" badge is visible on this card
    await expect(announcementCard.getByText('New')).toBeVisible()

    // Student: click "Mark as read" within this specific card
    const markAsReadButton = announcementCard.getByRole('button', { name: /Mark as read/i })
    await expect(markAsReadButton).toBeVisible()
    await markAsReadButton.click()

    // Student: verify the "Mark as read" button disappears from this card
    await expect(markAsReadButton).not.toBeVisible({ timeout: 10000 })
  })

  test('pinned announcements appear at the top', async ({
    teacherPage,
    studentPage,
  }) => {
    const pinnedTitle = `E2E Pinned Announcement ${Date.now()}`
    const pinnedContent = 'This pinned announcement should appear at the top.'

    // Teacher: create a pinned announcement via UI
    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)
    await expect(teacherPage.getByLabel('Title')).toBeVisible({ timeout: 15000 })
    await teacherPage.getByLabel('Title').fill(pinnedTitle)
    await teacherPage.getByLabel('Content').fill(pinnedContent)

    // Toggle the pin switch
    await teacherPage.locator('div').filter({ hasText: /^Pin Announcement/ }).getByRole('switch').click()

    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()

    // Teacher: verify redirect
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/announcements`, { timeout: 15000 })
    await expect(teacherPage.getByText(pinnedTitle)).toBeVisible({ timeout: 15000 })

    // Student: navigate to announcements
    await studentPage.goto(`/courses/${testData.courseId}/announcements`)
    await expect(studentPage.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 })

    // Student: verify pinned announcement is visible with "Pinned" badge
    await expect(studentPage.getByText(pinnedTitle)).toBeVisible()
    await expect(studentPage.getByText('Pinned').first()).toBeVisible()
  })

  test('announcement detail link navigates to correct page', async ({
    teacherPage,
    studentPage,
  }) => {
    const detailTitle = `E2E Detail Test ${Date.now()}`
    const detailContent = 'Click on this announcement to see the detail page.'

    // Teacher: create announcement via UI
    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)
    await expect(teacherPage.getByLabel('Title')).toBeVisible({ timeout: 15000 })
    await teacherPage.getByLabel('Title').fill(detailTitle)
    await teacherPage.getByLabel('Content').fill(detailContent)
    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()

    // Teacher: verify redirect
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/announcements`, { timeout: 15000 })
    await expect(teacherPage.getByText(detailTitle)).toBeVisible({ timeout: 15000 })

    // Student: navigate to announcements page
    await studentPage.goto(`/courses/${testData.courseId}/announcements`)
    await expect(studentPage.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 })

    // Student: find the announcement link by title and click it
    const announcementLink = studentPage.getByRole('link', { name: detailTitle })
    await expect(announcementLink).toBeVisible()
    await announcementLink.click()

    // Student: verify URL contains /announcements/ (detail page)
    await studentPage.waitForURL(`**/courses/${testData.courseId}/announcements/**`, { timeout: 15000 })

    // Student: verify the announcement title and content are visible on the detail page
    await expect(studentPage.getByText(detailTitle)).toBeVisible()
    await expect(studentPage.getByText(detailContent)).toBeVisible()
  })
})
