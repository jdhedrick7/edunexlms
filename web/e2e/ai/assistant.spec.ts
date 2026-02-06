import { test, expect } from '../fixtures/supabase.fixture'

test.describe('AI Assistant', () => {
  test('teacher can navigate to /assistant and page loads', async ({
    teacherPage,
  }) => {
    await teacherPage.goto('/assistant')

    // Verify the AI Assistant page heading is visible
    await expect(
      teacherPage.getByRole('heading', { name: 'AI Assistant' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the subtitle text
    await expect(
      teacherPage.getByText('Your teaching companion')
    ).toBeVisible()
  })

  test('assistant chat interface is visible with welcome state', async ({
    teacherPage,
  }) => {
    await teacherPage.goto('/assistant')

    // Wait for the page to load
    await expect(
      teacherPage.getByRole('heading', { name: 'AI Assistant' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the welcome greeting is shown
    await expect(
      teacherPage.getByText(/^(Hi|Hello)/)
    ).toBeVisible()

    // Verify assistant-specific welcome message
    await expect(
      teacherPage.getByText(
        "I'm your teaching assistant. Let's manage your courses together."
      )
    ).toBeVisible()

    // Verify assistant-specific quick action cards
    await expect(
      teacherPage.getByText('Student progress')
    ).toBeVisible()

    await expect(
      teacherPage.getByText('Grade submissions')
    ).toBeVisible()

    await expect(
      teacherPage.getByText('Course analytics')
    ).toBeVisible()

    await expect(
      teacherPage.getByText('Create content')
    ).toBeVisible()
  })

  test('assistant chat input has correct placeholder', async ({
    teacherPage,
  }) => {
    await teacherPage.goto('/assistant')

    await expect(
      teacherPage.getByRole('heading', { name: 'AI Assistant' })
    ).toBeVisible({ timeout: 15000 })

    // Verify textarea is present with assistant-specific placeholder
    const textarea = teacherPage.getByPlaceholder(
      'What would you like help with?'
    )
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeEnabled()

    // Verify the submit button is present
    const submitButton = teacherPage.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
  })

  test('teacher can type and send a message with mocked AI response', async ({
    teacherPage,
  }) => {
    // Set up route interception for the assistant chat API
    await teacherPage.route('**/api/assistant/chat', async (route) => {
      const sseBody = [
        'data: {"content":"Sure! "}\n\n',
        'data: {"content":"Here are the pending "}\n\n',
        'data: {"content":"submissions for your course."}\n\n',
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

    await teacherPage.goto('/assistant')

    // Wait for the page to load
    await expect(
      teacherPage.getByRole('heading', { name: 'AI Assistant' })
    ).toBeVisible({ timeout: 15000 })

    // Type a message in the textarea
    const textarea = teacherPage.getByPlaceholder(
      'What would you like help with?'
    )
    await textarea.fill('What submissions need grading?')

    // Verify the text was entered
    await expect(textarea).toHaveValue('What submissions need grading?')

    // Submit the message
    await teacherPage.locator('button[type="submit"]').click()

    // Verify the user message appears in the chat
    await expect(
      teacherPage.getByText('What submissions need grading?')
    ).toBeVisible({ timeout: 10000 })

    // Verify the mocked AI response appears in the chat
    await expect(
      teacherPage.getByText(
        'Sure! Here are the pending submissions for your course.'
      )
    ).toBeVisible({ timeout: 10000 })

    // Verify the textarea is cleared after sending
    await expect(textarea).toHaveValue('')
  })

  test('assistant quick action cards populate the input field', async ({
    teacherPage,
  }) => {
    await teacherPage.goto('/assistant')

    // Wait for the page to load
    await expect(
      teacherPage.getByText('Grade submissions')
    ).toBeVisible({ timeout: 15000 })

    // Click the "Grade submissions" quick action
    await teacherPage.getByText('Grade submissions').click()

    // Verify the textarea is populated with the pre-filled text
    const textarea = teacherPage.getByPlaceholder(
      'What would you like help with?'
    )
    await expect(textarea).toHaveValue('What submissions need grading?')
  })

  test('student cannot access /assistant - gets redirected', async ({
    studentPage,
  }) => {
    // Navigate to /assistant as a student
    await studentPage.goto('/assistant')

    // Student should be redirected to /dashboard (the assistant page
    // checks for teacher/TA role and redirects students)
    await expect(studentPage).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // The AI Assistant heading should NOT be visible
    await expect(
      studentPage.getByRole('heading', { name: 'AI Assistant' })
    ).not.toBeVisible()
  })

  test('TA can access /assistant', async ({ taPage }) => {
    await taPage.goto('/assistant')

    // Verify the AI Assistant page heading is visible
    await expect(
      taPage.getByRole('heading', { name: 'AI Assistant' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the subtitle text
    await expect(
      taPage.getByText('Your teaching companion')
    ).toBeVisible()
  })

  test('course selector is present in the assistant input area', async ({
    teacherPage,
  }) => {
    await teacherPage.goto('/assistant')

    await expect(
      teacherPage.getByRole('heading', { name: 'AI Assistant' })
    ).toBeVisible({ timeout: 15000 })

    // The course selector button should be visible
    const courseSelectorButton = teacherPage.locator(
      'button:has-text("All Courses")'
    )
    await expect(courseSelectorButton).toBeVisible()
  })

  test('submit button is disabled when input is empty', async ({
    teacherPage,
  }) => {
    await teacherPage.goto('/assistant')

    await expect(
      teacherPage.getByRole('heading', { name: 'AI Assistant' })
    ).toBeVisible({ timeout: 15000 })

    // Verify the submit button is disabled when no text is entered
    const submitButton = teacherPage.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()

    // Type some text
    const textarea = teacherPage.getByPlaceholder(
      'What would you like help with?'
    )
    await textarea.fill('test')

    // Verify the submit button is now enabled
    await expect(submitButton).toBeEnabled()
  })
})
