import { test, expect } from '../fixtures/auth.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

test.describe('Course Builder Integration (UI Only)', () => {
  // Clear stale draft data before each test to ensure clean starting state
  test.beforeEach(async ({ teacherPage }) => {
    await teacherPage.request.post(
      `http://localhost:3000/api/courses/${testData.courseId}/draft`,
      {
        data: { modules: [] },
        headers: { 'Content-Type': 'application/json' },
      }
    )
  })

  test('teacher can add a module, save draft, and verify it persists after reload', async ({
    teacherPage,
  }) => {
    const moduleTitle = `E2E Module ${Date.now()}`
    const moduleDesc = 'Auto-generated module for E2E testing'
    const moduleContent = '# E2E Module Content\n\nThis is test content for module verification.'

    await teacherPage.goto(`/courses/${testData.courseId}`)

    // Navigate to Builder tab
    await teacherPage.getByRole('button', { name: 'Builder' }).click()

    // Wait for Builder to load
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Click "Add Module" button
    await teacherPage.getByRole('button', { name: 'Add Module' }).first().click()

    // Verify the module dialog opens
    await expect(
      teacherPage.getByRole('heading', { name: 'Add Module' })
    ).toBeVisible()

    // Fill in module details
    await teacherPage.getByPlaceholder('e.g., Introduction to Variables').fill(moduleTitle)
    await teacherPage.getByPlaceholder('Brief overview').fill(moduleDesc)
    await teacherPage.getByPlaceholder('Write your lesson content...').fill(moduleContent)

    // Submit the module dialog
    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Module' })
      .click()

    // Dialog should close
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Verify the module appears in the builder list
    await expect(teacherPage.getByText(moduleTitle)).toBeVisible({ timeout: 10000 })

    // Click "Save Draft" button
    await teacherPage.getByRole('button', { name: 'Save Draft' }).click()

    // Wait for save to complete (toast appears)
    await expect(teacherPage.getByText('Draft saved successfully')).toBeVisible({
      timeout: 15000,
    })

    // PERSISTENCE VERIFICATION: Reload the page and verify the module still exists
    await teacherPage.reload()

    // Navigate back to Builder tab
    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Verify the module persisted after reload
    await expect(teacherPage.getByText(moduleTitle)).toBeVisible({ timeout: 15000 })
  })

  test('teacher can add assignment to module, save, and verify it persists', async ({
    teacherPage,
  }) => {

    const moduleTitle = `E2E Assignment Module ${Date.now()}`
    const assignmentTitle = `E2E Assignment ${Date.now()}`

    await teacherPage.goto(`/courses/${testData.courseId}`)
    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Add a module first
    await teacherPage.getByRole('button', { name: 'Add Module' }).first().click()
    await expect(teacherPage.getByRole('heading', { name: 'Add Module' })).toBeVisible()
    await teacherPage.getByPlaceholder('e.g., Introduction to Variables').fill(moduleTitle)
    await teacherPage.getByPlaceholder('Brief overview').fill('Module with assignment')
    await teacherPage.getByPlaceholder('Write your lesson content...').fill('# Lesson\n\nRead this.')
    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Module' })
      .click()
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Module auto-expands after creation - wait for "Add Assignment" button to be visible
    await expect(teacherPage.getByRole('button', { name: 'Add Assignment' })).toBeVisible({ timeout: 10000 })

    // Click "Add Assignment"
    await teacherPage.getByRole('button', { name: 'Add Assignment' }).click()

    // Verify assignment dialog opens
    await expect(
      teacherPage.getByRole('heading', { name: 'Add Assignment' })
    ).toBeVisible()

    // Fill in assignment details (Labels lack htmlFor, so use placeholders)
    await teacherPage.getByPlaceholder('e.g., Week 1 Homework').fill(assignmentTitle)
    await teacherPage.getByPlaceholder('Brief description').fill('Test assignment description')
    await teacherPage.getByPlaceholder('Detailed instructions...').fill('Submit your work here.')
    const pointsInput = teacherPage.getByRole('dialog').locator('input[type="number"]').nth(1)
    await pointsInput.clear()
    await pointsInput.fill('50')

    // Submit
    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Assignment' })
      .click()
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Verify "Assignment" badge appears on the module
    await expect(teacherPage.getByText('Assignment').first()).toBeVisible()

    // Save the draft
    await teacherPage.getByRole('button', { name: 'Save Draft' }).click()
    await expect(teacherPage.getByText('Draft saved successfully')).toBeVisible({
      timeout: 15000,
    })

    // PERSISTENCE VERIFICATION: Reload and verify assignment persists
    await teacherPage.reload()

    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Expand the module (click its title)
    await expect(teacherPage.getByText(moduleTitle)).toBeVisible({ timeout: 15000 })
    await teacherPage.getByText(moduleTitle).click()

    // Verify Assignment badge still shows
    await expect(teacherPage.getByText('Assignment').first()).toBeVisible({ timeout: 15000 })
  })

  test('teacher can add quiz to module, save, and verify it persists', async ({
    teacherPage,
  }) => {

    const moduleTitle = `E2E Quiz Module ${Date.now()}`
    const quizTitle = `E2E Quiz ${Date.now()}`

    await teacherPage.goto(`/courses/${testData.courseId}`)
    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Add a module
    await teacherPage.getByRole('button', { name: 'Add Module' }).first().click()
    await expect(teacherPage.getByRole('heading', { name: 'Add Module' })).toBeVisible()
    await teacherPage.getByPlaceholder('e.g., Introduction to Variables').fill(moduleTitle)
    await teacherPage.getByPlaceholder('Brief overview').fill('Module with quiz')
    await teacherPage.getByPlaceholder('Write your lesson content...').fill('# Lesson\n\nLearn this.')
    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Module' })
      .click()
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Module auto-expands after creation - wait for "Add Quiz" button to be visible
    await expect(teacherPage.getByRole('button', { name: 'Add Quiz' })).toBeVisible({ timeout: 10000 })

    // Click "Add Quiz"
    await teacherPage.getByRole('button', { name: 'Add Quiz' }).click()

    // Verify quiz dialog opens
    await expect(
      teacherPage.getByRole('heading', { name: 'Add Quiz' })
    ).toBeVisible()

    // Fill in quiz details (Labels lack htmlFor, so use placeholders)
    await teacherPage.getByPlaceholder('e.g., Module 1 Quiz').fill(quizTitle)
    await teacherPage.getByPlaceholder('Brief description').fill('Test quiz')

    // Add a question
    await teacherPage.getByRole('button', { name: 'Add Question' }).click()

    // Fill in the question
    const questionTextarea = teacherPage.locator('textarea').last()
    await questionTextarea.fill('What is 2 + 2?')

    // Fill in the options (multiple choice by default)
    const optionInputs = teacherPage.locator('input[placeholder^="Option"]')
    await optionInputs.nth(0).fill('3')
    await optionInputs.nth(1).fill('4')
    await optionInputs.nth(2).fill('5')
    await optionInputs.nth(3).fill('6')

    // Select correct answer (option 2 = "4")
    const radioButtons = teacherPage.locator(`input[type="radio"][name^="correct-"]`)
    await radioButtons.nth(1).click()

    // Submit the quiz
    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Quiz' })
      .click()
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Verify "Quiz" badge appears
    await expect(teacherPage.getByText('Quiz').first()).toBeVisible()

    // Save the draft
    await teacherPage.getByRole('button', { name: 'Save Draft' }).click()
    await expect(teacherPage.getByText('Draft saved successfully')).toBeVisible({
      timeout: 15000,
    })

    // PERSISTENCE VERIFICATION: Reload and verify quiz persists
    await teacherPage.reload()

    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Expand the module (click its title)
    await expect(teacherPage.getByText(moduleTitle)).toBeVisible({ timeout: 15000 })
    await teacherPage.getByText(moduleTitle).click()

    // Verify Quiz badge still shows
    await expect(teacherPage.getByText('Quiz').first()).toBeVisible({ timeout: 15000 })
  })

  test('teacher can create a version and verify it appears in Versions tab', async ({
    teacherPage,
  }) => {

    const moduleTitle = `E2E Publish Module ${Date.now()}`
    const moduleContent = '# Published Content\n\nThis module was published by E2E test.'

    await teacherPage.goto(`/courses/${testData.courseId}`)
    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Add a module
    await teacherPage.getByRole('button', { name: 'Add Module' }).first().click()
    await expect(teacherPage.getByRole('heading', { name: 'Add Module' })).toBeVisible()
    await teacherPage.getByPlaceholder('e.g., Introduction to Variables').fill(moduleTitle)
    await teacherPage.getByPlaceholder('Brief overview').fill('Module for publish test')
    await teacherPage.getByPlaceholder('Write your lesson content...').fill(moduleContent)
    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Module' })
      .click()
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Verify module appears
    await expect(teacherPage.getByText(moduleTitle)).toBeVisible({ timeout: 10000 })

    // Click "Create Version" to publish
    await teacherPage.getByRole('button', { name: 'Create Version' }).click()

    // Wait for the success toast
    await expect(
      teacherPage.getByText('Course version created!')
    ).toBeVisible({ timeout: 30000 })

    // UI auto-switches to Versions tab - verify a version card is visible
    await expect(teacherPage.getByText(/Version \d+/).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(teacherPage.getByText('Draft').first()).toBeVisible({ timeout: 15000 })
  })

  test('teacher can create module with assignment, publish version, verify student sees content', async ({
    teacherPage,
    studentPage,
  }) => {

    const moduleTitle = `E2E Full Module ${Date.now()}`
    const assignmentTitle = `E2E Full Assignment ${Date.now()}`
    const moduleContent = '# Full Module\n\nContent with assignment.'

    await teacherPage.goto(`/courses/${testData.courseId}`)
    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Add module
    await teacherPage.getByRole('button', { name: 'Add Module' }).first().click()
    await teacherPage.getByPlaceholder('e.g., Introduction to Variables').fill(moduleTitle)
    await teacherPage.getByPlaceholder('Brief overview').fill('Full module test')
    await teacherPage.getByPlaceholder('Write your lesson content...').fill(moduleContent)
    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Module' })
      .click()
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Module auto-expands after creation - add assignment
    await expect(teacherPage.getByRole('button', { name: 'Add Assignment' })).toBeVisible({ timeout: 10000 })
    await teacherPage.getByRole('button', { name: 'Add Assignment' }).click()
    await expect(
      teacherPage.getByRole('heading', { name: 'Add Assignment' })
    ).toBeVisible()

    await teacherPage.getByPlaceholder('e.g., Week 1 Homework').fill(assignmentTitle)
    await teacherPage.getByPlaceholder('Brief description').fill('Submit your work')
    await teacherPage.getByPlaceholder('Detailed instructions...').fill('Write an essay.')
    const pointsInput2 = teacherPage.getByRole('dialog').locator('input[type="number"]').nth(1)
    await pointsInput2.clear()
    await pointsInput2.fill('100')

    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Assignment' })
      .click()
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Create version (triggers tab switch → versions refresh on mount)
    await teacherPage.getByRole('button', { name: 'Create Version' }).click()
    await expect(
      teacherPage.getByText('Course version created!')
    ).toBeVisible({ timeout: 30000 })

    // Wait for Versions tab to load and stabilize
    await expect(teacherPage.getByRole('heading', { name: 'Course Versions' })).toBeVisible({ timeout: 15000 })
    await teacherPage.waitForTimeout(2000)

    // Publish the first (newest) version using dispatchEvent for reliable click delivery
    await teacherPage.getByRole('button', { name: 'Publish', exact: true }).first().dispatchEvent('click')

    // Wait for publish confirmation toast
    await expect(teacherPage.getByText('Version published successfully')).toBeVisible({ timeout: 15000 })

    // STUDENT VERIFICATION: Navigate to course and verify module is visible in Content tab
    await studentPage.goto(`/courses/${testData.courseId}`)
    await expect(
      studentPage.getByRole('heading', { name: testData.courseName })
    ).toBeVisible({ timeout: 15000 })

    // Click "Content" tab (or it may already be the default)
    const contentTab = studentPage.getByRole('button', { name: 'Content' })
    if (await contentTab.isVisible()) {
      await contentTab.click()
    }

    // Verify the module title is visible in the content area (appears in sidebar + content)
    await expect(studentPage.getByText(moduleTitle).first()).toBeVisible({ timeout: 15000 })
  })

  test('teacher can delete a module from the builder', async ({ teacherPage }) => {
    const moduleTitle = `E2E Delete Module ${Date.now()}`

    await teacherPage.goto(`/courses/${testData.courseId}`)
    await teacherPage.getByRole('button', { name: 'Builder' }).click()
    await expect(
      teacherPage.getByText('Course Builder', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Add a module (Labels lack htmlFor, so use placeholders)
    await teacherPage.getByRole('button', { name: 'Add Module' }).first().click()
    await teacherPage.getByPlaceholder('e.g., Introduction to Variables').fill(moduleTitle)
    await teacherPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add Module' })
      .click()
    await expect(teacherPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Verify the module is visible
    await expect(teacherPage.getByText(moduleTitle)).toBeVisible({ timeout: 10000 })

    // Delete the module using the trash button scoped to the Card containing the module title
    const moduleCard = teacherPage.locator('[data-slot="card"]').filter({
      has: teacherPage.locator('[data-slot="card-title"]', { hasText: moduleTitle }),
    })
    const deleteButton = moduleCard.locator('button:has(svg.text-destructive)')
    await deleteButton.click()

    // Module should no longer be visible
    await expect(teacherPage.getByText(moduleTitle)).not.toBeVisible()
  })
})
