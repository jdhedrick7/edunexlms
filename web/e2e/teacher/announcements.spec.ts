import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

// Track announcement IDs created during tests for cleanup
const createdAnnouncementIds: string[] = []

test.describe('Teacher announcements', () => {
  test.afterAll(async ({ supabaseAdmin }) => {
    if (!supabaseAdmin) return

    // Clean up any announcements created during tests
    if (createdAnnouncementIds.length > 0) {
      await supabaseAdmin
        .from('announcements')
        .delete()
        .in('id', createdAnnouncementIds)
    }

    // Also clean up by title pattern as a safety net
    await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('course_id', testData.courseId)
      .like('title', 'E2E Test Announcement%')
  })

  test('teacher can navigate to course announcements page', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}/announcements`)

    // The announcements page shows the heading
    await expect(
      teacherPage.getByRole('heading', { name: 'Announcements', level: 1 })
    ).toBeVisible({ timeout: 15000 })
  })

  test('teacher sees "New Announcement" button on announcements page', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}/announcements`)

    // Staff sees the "New Announcement" button
    const newButton = teacherPage.getByRole('link', { name: /New Announcement/ })
    await expect(newButton).toBeVisible()
  })

  test('teacher can navigate to new announcement form', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)

    // The new announcement page shows the form heading
    await expect(
      teacherPage.getByRole('heading', { name: 'New Announcement' })
    ).toBeVisible()

    // The form card shows "Create Announcement" title (CardTitle renders as div)
    await expect(
      teacherPage.getByText('Create Announcement', { exact: true }).first()
    ).toBeVisible()

    // Title and Content fields are visible
    await expect(teacherPage.getByLabel('Title')).toBeVisible()
    await expect(teacherPage.getByLabel('Content')).toBeVisible()

    // Pin toggle is visible
    await expect(teacherPage.getByText('Pin Announcement')).toBeVisible()

    // Submit button is visible
    await expect(
      teacherPage.getByRole('button', { name: 'Create Announcement' })
    ).toBeVisible()

    // Cancel button is visible
    await expect(
      teacherPage.getByRole('button', { name: 'Cancel' })
    ).toBeVisible()
  })

  test('teacher can create a new announcement', async ({ teacherPage, supabaseAdmin }) => {
    const uniqueTitle = `E2E Test Announcement ${Date.now()}`
    const content = 'This is an automated test announcement created by Playwright E2E tests.'

    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)

    // Wait for form to be ready
    await expect(teacherPage.getByLabel('Title')).toBeVisible({ timeout: 15000 })

    // Fill in the announcement form
    await teacherPage.getByLabel('Title').fill(uniqueTitle)
    await teacherPage.getByLabel('Content').fill(content)

    // Submit the form
    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()

    // Should redirect to announcements list after creation
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/announcements`, {
      timeout: 15_000,
    })

    // Verify the announcement appears in the list
    await expect(teacherPage.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 })

    // DB verification: confirm the announcement exists with correct fields
    if (supabaseAdmin) {
      const { data: dbAnnouncement, error } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .eq('course_id', testData.courseId)
        .eq('title', uniqueTitle)
        .single()

      expect(error).toBeNull()
      expect(dbAnnouncement).not.toBeNull()
      expect(dbAnnouncement!.course_id).toBe(testData.courseId)
      expect(dbAnnouncement!.author_id).toBe(testData.users.teacher.id)
      expect(dbAnnouncement!.title).toBe(uniqueTitle)
      expect(dbAnnouncement!.content).toBe(content)
      expect(dbAnnouncement!.pinned).toBe(false)

      // Track for cleanup
      createdAnnouncementIds.push(dbAnnouncement!.id)
    }
  })

  test('teacher can create a pinned announcement', async ({ teacherPage, supabaseAdmin }) => {
    const uniqueTitle = `E2E Test Announcement Pinned ${Date.now()}`
    const content = 'This is a pinned test announcement.'

    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)

    // Wait for form to be ready
    await expect(teacherPage.getByLabel('Title')).toBeVisible({ timeout: 15000 })

    // Fill in the form
    await teacherPage.getByLabel('Title').fill(uniqueTitle)
    await teacherPage.getByLabel('Content').fill(content)

    // Toggle the pin switch - the switch is inside the "Pin Announcement" form item
    const pinSwitch = teacherPage
      .locator('div')
      .filter({ hasText: /^Pin Announcement/ })
      .getByRole('switch')
    await pinSwitch.click()

    // Submit
    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()

    // Should redirect to announcements list
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/announcements`, {
      timeout: 15_000,
    })

    // Verify announcement appears
    await expect(teacherPage.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 })

    // Pinned announcements display a "Pinned" badge
    await expect(teacherPage.getByText('Pinned').first()).toBeVisible()

    // DB verification: confirm pinned is true
    if (supabaseAdmin) {
      const { data: dbAnnouncement, error } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .eq('course_id', testData.courseId)
        .eq('title', uniqueTitle)
        .single()

      expect(error).toBeNull()
      expect(dbAnnouncement).not.toBeNull()
      expect(dbAnnouncement!.pinned).toBe(true)
      expect(dbAnnouncement!.author_id).toBe(testData.users.teacher.id)

      // Track for cleanup
      createdAnnouncementIds.push(dbAnnouncement!.id)
    }
  })

  test('announcement form validates required fields', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)

    // Click submit without filling anything
    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()

    // Validation messages should appear
    await expect(teacherPage.getByText('Title is required')).toBeVisible()
    await expect(teacherPage.getByText('Content is required')).toBeVisible()
  })

  test('teacher sees announcements in the inline Announcements tab too', async ({ teacherPage }) => {
    await teacherPage.goto(`/courses/${testData.courseId}`)

    // Click the Announcements tab within the course page
    await teacherPage.getByRole('button', { name: 'Announcements' }).click()

    // The inline tab shows an Announcements heading and a "New Announcement" button
    await expect(
      teacherPage.getByRole('heading', { name: 'Announcements' })
    ).toBeVisible()
    await expect(
      teacherPage.getByRole('link', { name: 'New Announcement' })
    ).toBeVisible()
  })
})
