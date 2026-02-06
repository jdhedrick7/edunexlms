import { test, expect } from '../fixtures/supabase.fixture'

test.describe('Notifications', () => {
  test('user can navigate to /notifications and page loads', async ({
    studentPage,
  }) => {
    // Mock the notifications API to return a predictable response
    await studentPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          unreadCount: 0,
          totalPages: 1,
        }),
      })
    })

    await studentPage.goto('/notifications')

    // Verify the Notifications page heading is visible
    await expect(
      studentPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })
  })

  test('notifications page shows "All caught up" when no unread', async ({
    studentPage,
  }) => {
    // Mock the notifications API with zero unread
    await studentPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          unreadCount: 0,
          totalPages: 1,
        }),
      })
    })

    await studentPage.goto('/notifications')

    await expect(
      studentPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the "All caught up!" message is displayed
    await expect(
      studentPage.getByText('All caught up!')
    ).toBeVisible()
  })

  test('notifications page shows filter tabs', async ({ studentPage }) => {
    // Mock the notifications API
    await studentPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          unreadCount: 0,
          totalPages: 1,
        }),
      })
    })

    await studentPage.goto('/notifications')

    await expect(
      studentPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the filter tabs are visible
    await expect(
      studentPage.getByRole('tab', { name: 'All' })
    ).toBeVisible()

    await expect(
      studentPage.getByRole('tab', { name: 'Grades' })
    ).toBeVisible()

    await expect(
      studentPage.getByRole('tab', { name: 'Submissions' })
    ).toBeVisible()

    await expect(
      studentPage.getByRole('tab', { name: 'Announcements' })
    ).toBeVisible()

    await expect(
      studentPage.getByRole('tab', { name: 'Messages' })
    ).toBeVisible()

    await expect(
      studentPage.getByRole('tab', { name: 'Edits' })
    ).toBeVisible()

    await expect(
      studentPage.getByRole('tab', { name: 'System' })
    ).toBeVisible()
  })

  test('notifications page shows "Mark all as read" button', async ({
    studentPage,
  }) => {
    // Mock with some unread notifications
    await studentPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            {
              id: 'notif-1',
              type: 'announcement',
              title: 'New course material available',
              body: 'Check out the new lecture notes.',
              read_at: null,
              created_at: new Date().toISOString(),
              course_id: null,
              user_id: 'test-user',
              data: null,
              course: null,
            },
          ],
          unreadCount: 1,
          totalPages: 1,
        }),
      })
    })

    await studentPage.goto('/notifications')

    await expect(
      studentPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the "Mark all as read" button is visible and enabled
    const markAllButton = studentPage.getByRole('button', {
      name: /Mark all as read/,
    })
    await expect(markAllButton).toBeVisible()
    await expect(markAllButton).toBeEnabled()
  })

  test('notifications page shows "No notifications found" for empty filtered view', async ({
    studentPage,
  }) => {
    // Mock the notifications API to return empty results
    await studentPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          unreadCount: 0,
          totalPages: 1,
        }),
      })
    })

    await studentPage.goto('/notifications')

    await expect(
      studentPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the empty state "No notifications found" text
    await expect(
      studentPage.getByText('No notifications found')
    ).toBeVisible()
  })

  test('notifications page displays notification items', async ({
    studentPage,
  }) => {
    const now = new Date().toISOString()

    // Mock the notifications API with some notifications
    await studentPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            {
              id: 'notif-1',
              type: 'grade',
              title: 'New grade posted',
              body: 'You received 95/100 on Assignment 1.',
              read_at: null,
              created_at: now,
              course_id: null,
              user_id: 'test-user',
              data: null,
              course: { id: 'c1', name: 'Test Course', code: 'TEST101' },
            },
            {
              id: 'notif-2',
              type: 'announcement',
              title: 'Class canceled tomorrow',
              body: 'Due to weather, class is canceled.',
              read_at: now,
              created_at: now,
              course_id: null,
              user_id: 'test-user',
              data: null,
              course: null,
            },
          ],
          unreadCount: 1,
          totalPages: 1,
        }),
      })
    })

    await studentPage.goto('/notifications')

    await expect(
      studentPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the unread count message
    await expect(
      studentPage.getByText(/You have 1 unread notification/)
    ).toBeVisible()

    // Verify both notification titles are visible
    await expect(
      studentPage.getByText('New grade posted')
    ).toBeVisible()

    await expect(
      studentPage.getByText('Class canceled tomorrow')
    ).toBeVisible()

    // Verify notification body text is shown
    await expect(
      studentPage.getByText('You received 95/100 on Assignment 1.')
    ).toBeVisible()

    // Verify course code is shown for course-linked notification
    await expect(
      studentPage.getByText('TEST101')
    ).toBeVisible()
  })

  test('notifications page shows "All Notifications" card heading', async ({
    studentPage,
  }) => {
    // Mock the notifications API
    await studentPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          unreadCount: 0,
          totalPages: 1,
        }),
      })
    })

    await studentPage.goto('/notifications')

    await expect(
      studentPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the "All Notifications" card heading (CardTitle renders as div)
    await expect(
      studentPage.getByText('All Notifications', { exact: true })
    ).toBeVisible()
  })

  test('teacher can access notifications page', async ({ teacherPage }) => {
    // Mock the notifications API
    await teacherPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          unreadCount: 0,
          totalPages: 1,
        }),
      })
    })

    await teacherPage.goto('/notifications')

    // Verify the Notifications page heading is visible
    await expect(
      teacherPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the description shows "All caught up!" with zero unread
    await expect(
      teacherPage.getByText('All caught up!')
    ).toBeVisible()
  })

  test('"Mark all as read" button is disabled when no unread notifications', async ({
    studentPage,
  }) => {
    // Mock with zero unread
    await studentPage.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          unreadCount: 0,
          totalPages: 1,
        }),
      })
    })

    await studentPage.goto('/notifications')

    await expect(
      studentPage.getByRole('heading', { name: 'Notifications' })
    ).toBeVisible({ timeout: 15000 })

    // "Mark all as read" button should be disabled when unreadCount is 0
    const markAllButton = studentPage.getByRole('button', {
      name: /Mark all as read/,
    })
    await expect(markAllButton).toBeVisible()
    await expect(markAllButton).toBeDisabled()
  })
})
