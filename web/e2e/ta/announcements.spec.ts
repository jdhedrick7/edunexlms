import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('TA Announcements', () => {
  test('TA can view course announcements page', async ({ taPage }) => {
    await taPage.goto(`/courses/${testData.courseId}/announcements`)

    // Verify the announcements page heading is visible
    await expect(
      taPage.getByRole('heading', { name: 'Announcements', level: 1 })
    ).toBeVisible({ timeout: 15000 })

    // Verify the description text is shown
    await expect(
      taPage.getByText('Course updates and important information')
    ).toBeVisible()

    // As staff, the "New Announcement" button should be visible
    await expect(
      taPage.getByRole('link', { name: /New Announcement/ })
    ).toBeVisible()
  })

  test('TA can navigate to create new announcement page', async ({
    taPage,
  }) => {
    await taPage.goto(`/courses/${testData.courseId}/announcements/new`)

    // Verify the new announcement page heading is visible
    await expect(
      taPage.getByRole('heading', { name: 'New Announcement' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the description mentions creating an announcement
    await expect(
      taPage.getByText('Create a new announcement for your students')
    ).toBeVisible()
  })

  test('TA sees empty state when no announcements exist', async ({
    taPage,
  }) => {
    // Mock the announcements API to return an empty list
    await taPage.route('**/api/announcements?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          announcements: [],
          total: 0,
          limit: 20,
          offset: 0,
          isStaff: true,
        }),
      })
    })

    await taPage.goto(`/courses/${testData.courseId}/announcements`)

    // Verify empty state message
    await expect(
      taPage.getByText('No announcements yet')
    ).toBeVisible({ timeout: 15000 })

    // Staff should see the "Create Announcement" CTA in the empty state
    await expect(
      taPage.getByRole('link', { name: /Create Announcement/ })
    ).toBeVisible()
  })

  test('student cannot see the New Announcement button', async ({
    studentPage,
  }) => {
    // Mock the announcements API to return as non-staff
    await studentPage.route('**/api/announcements?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          announcements: [],
          total: 0,
          limit: 20,
          offset: 0,
          isStaff: false,
        }),
      })
    })

    await studentPage.goto(
      `/courses/${testData.courseId}/announcements`
    )

    // Verify the announcements page heading is visible
    await expect(
      studentPage.getByRole('heading', { name: 'Announcements' })
    ).toBeVisible({ timeout: 15000 })

    // The "New Announcement" button should NOT be visible for students
    await expect(
      studentPage.getByRole('link', { name: /New Announcement/ })
    ).not.toBeVisible()

    // Student should see the non-staff empty state text
    await expect(
      studentPage.getByText('Check back later for updates from your instructor')
    ).toBeVisible()
  })
})
