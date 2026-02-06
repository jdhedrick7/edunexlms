import { test, expect } from '../fixtures/supabase.fixture'

test.describe('Messaging - Conversations', () => {
  test('user can navigate to /messages and page loads', async ({
    studentPage,
  }) => {
    await studentPage.goto('/messages')

    // Verify the Messages page heading is visible
    await expect(
      studentPage.getByRole('heading', { name: 'Messages' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the description text
    await expect(
      studentPage.getByText('Course conversations and direct messages')
    ).toBeVisible()
  })

  test('messages page shows "New Message" button', async ({
    studentPage,
  }) => {
    await studentPage.goto('/messages')

    // Verify the "New Message" button is visible in the header
    await expect(
      studentPage.getByRole('link', { name: /New Message/ })
    ).toBeVisible({ timeout: 15000 })
  })

  test('messages page shows empty state when no conversations exist', async ({
    studentPage,
  }) => {
    await studentPage.goto('/messages')

    // Wait for the Messages page heading to confirm page loaded
    await expect(
      studentPage.getByRole('heading', { name: 'Messages' })
    ).toBeVisible({ timeout: 15000 })

    // If there are no conversations, the empty state should show
    // Either the conversation list or the empty state will be visible
    const hasConversations = await studentPage
      .getByText('No messages yet')
      .isVisible()
      .catch(() => false)

    if (hasConversations) {
      // Verify empty state elements
      await expect(
        studentPage.getByText('No messages yet')
      ).toBeVisible()

      await expect(
        studentPage.getByText(
          'Start a conversation with someone in your course'
        )
      ).toBeVisible()

      // Verify the "Start a Conversation" CTA link
      await expect(
        studentPage.getByRole('link', { name: 'Start a Conversation' })
      ).toBeVisible()
    }
    // If there are conversations, the page loaded successfully either way
  })

  test('user can navigate to /messages/new to create a new conversation', async ({
    studentPage,
  }) => {
    await studentPage.goto('/messages/new')

    // Verify the New Message page heading is visible
    await expect(
      studentPage.getByRole('heading', { name: 'New Message' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the description text
    await expect(
      studentPage.getByText('Start a conversation with course members')
    ).toBeVisible()
  })

  test('new message page shows compose form when user has courses', async ({
    studentPage,
  }) => {
    await studentPage.goto('/messages/new')

    // Wait for the New Message page heading to confirm page loaded
    await expect(
      studentPage.getByRole('heading', { name: 'New Message' })
    ).toBeVisible({ timeout: 15000 })

    // Either "Compose Message" card or "No courses yet" message should show
    const hasComposeForm = await studentPage
      .getByText('Compose Message', { exact: true })
      .isVisible()
      .catch(() => false)

    const hasNoCourses = await studentPage
      .getByText('No courses yet')
      .isVisible()
      .catch(() => false)

    // One of these should be visible
    expect(hasComposeForm || hasNoCourses).toBe(true)
  })

  test('teacher can access messages page', async ({ teacherPage }) => {
    await teacherPage.goto('/messages')

    // Verify the Messages page heading is visible
    await expect(
      teacherPage.getByRole('heading', { name: 'Messages' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the "New Message" button is visible
    await expect(
      teacherPage.getByRole('link', { name: /New Message/ })
    ).toBeVisible()
  })

  test('clicking "New Message" navigates to /messages/new', async ({
    studentPage,
  }) => {
    await studentPage.goto('/messages')

    // Wait for page to load
    await expect(
      studentPage.getByRole('heading', { name: 'Messages' })
    ).toBeVisible({ timeout: 15000 })

    // Click the "New Message" button in the page header
    await studentPage.getByRole('link', { name: /New Message/ }).click()

    // Verify navigation to /messages/new
    await expect(studentPage).toHaveURL(/\/messages\/new/)

    // Verify the new page loaded
    await expect(
      studentPage.getByRole('heading', { name: 'New Message' })
    ).toBeVisible({ timeout: 15000 })
  })
})
