import { test, expect } from '../fixtures/supabase.fixture'

test.describe('AI Tutor', () => {
  test('student can navigate to /tutor and page loads', async ({
    studentPage,
  }) => {
    await studentPage.goto('/tutor')

    // Verify the AI Tutor page heading is visible
    await expect(
      studentPage.getByRole('heading', { name: 'AI Tutor' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the subtitle text
    await expect(
      studentPage.getByText('Your personal learning companion')
    ).toBeVisible()
  })

  test('chat interface is visible with welcome state', async ({
    studentPage,
  }) => {
    await studentPage.goto('/tutor')

    // Wait for the page to load
    await expect(
      studentPage.getByRole('heading', { name: 'AI Tutor' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the welcome greeting is shown (starts with "Hi" or "Hello")
    await expect(
      studentPage.getByText(/^(Hi|Hello)/)
    ).toBeVisible()

    // Verify tutor-specific welcome message
    await expect(
      studentPage.getByText(
        "I'm your AI tutor. Ask me anything about your courses."
      )
    ).toBeVisible()

    // Verify quick action cards are visible
    await expect(
      studentPage.getByText('Explain a concept')
    ).toBeVisible()

    await expect(
      studentPage.getByText('Help with assignment')
    ).toBeVisible()

    await expect(
      studentPage.getByText('Quiz me')
    ).toBeVisible()

    await expect(
      studentPage.getByText('Summarize material')
    ).toBeVisible()
  })

  test('chat input area is visible with correct placeholder', async ({
    studentPage,
  }) => {
    await studentPage.goto('/tutor')

    await expect(
      studentPage.getByRole('heading', { name: 'AI Tutor' })
    ).toBeVisible({ timeout: 15000 })

    // Verify textarea is present with tutor-specific placeholder
    const textarea = studentPage.getByPlaceholder('Ask me anything...')
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeEnabled()

    // Verify the submit button is present
    const submitButton = studentPage.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()

    // Verify the helper text
    await expect(
      studentPage.getByText('Press Enter to send, Shift+Enter for new line')
    ).toBeVisible()
  })

  test('student can type a message and send it with mocked AI response', async ({
    studentPage,
  }) => {
    // Set up route interception for the tutor chat API
    // The chat uses Server-Sent Events (SSE) streaming
    await studentPage.route('**/api/tutor/chat', async (route) => {
      const sseBody = [
        'data: {"content":"Hello! "}\n\n',
        'data: {"content":"I can help you "}\n\n',
        'data: {"content":"with that topic."}\n\n',
        'data: [DONE]\n\n',
      ].join('')

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseBody,
      })
    })

    await studentPage.goto('/tutor')

    // Wait for the page to load
    await expect(
      studentPage.getByRole('heading', { name: 'AI Tutor' })
    ).toBeVisible({ timeout: 15000 })

    // Type a message in the textarea
    const textarea = studentPage.getByPlaceholder('Ask me anything...')
    await textarea.fill('What is photosynthesis?')

    // Verify the text was entered
    await expect(textarea).toHaveValue('What is photosynthesis?')

    // Submit the message by clicking the submit button
    await studentPage.locator('button[type="submit"]').click()

    // Verify the user message appears in the chat
    await expect(
      studentPage.getByText('What is photosynthesis?')
    ).toBeVisible({ timeout: 10000 })

    // Verify the mocked AI response appears in the chat
    await expect(
      studentPage.getByText('Hello! I can help you with that topic.')
    ).toBeVisible({ timeout: 10000 })

    // Verify the textarea is cleared after sending
    await expect(textarea).toHaveValue('')
  })

  test('quick action cards populate the input field', async ({
    studentPage,
  }) => {
    await studentPage.goto('/tutor')

    // Wait for the page to load
    await expect(
      studentPage.getByText('Explain a concept')
    ).toBeVisible({ timeout: 15000 })

    // Click the "Explain a concept" quick action
    await studentPage.getByText('Explain a concept').click()

    // Verify the textarea is populated with the pre-filled text
    const textarea = studentPage.getByPlaceholder('Ask me anything...')
    await expect(textarea).toHaveValue('Can you explain ')
  })

  test('submit button is disabled when input is empty', async ({
    studentPage,
  }) => {
    await studentPage.goto('/tutor')

    await expect(
      studentPage.getByRole('heading', { name: 'AI Tutor' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the submit button is disabled when no text is entered
    const submitButton = studentPage.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()

    // Type some text
    const textarea = studentPage.getByPlaceholder('Ask me anything...')
    await textarea.fill('test')

    // Verify the submit button is now enabled
    await expect(submitButton).toBeEnabled()

    // Clear the text
    await textarea.fill('')

    // Verify the submit button is disabled again
    await expect(submitButton).toBeDisabled()
  })

  test('course selector is present in the input area', async ({
    studentPage,
  }) => {
    await studentPage.goto('/tutor')

    await expect(
      studentPage.getByRole('heading', { name: 'AI Tutor' })
    ).toBeVisible({ timeout: 15000 })

    // The course selector button should be visible (shows "All Courses" by default)
    // It is rendered as a plain button with BookOpen icon and course name text
    const courseSelectorButton = studentPage.locator(
      'button:has-text("All Courses")'
    )
    await expect(courseSelectorButton).toBeVisible()
  })
})
