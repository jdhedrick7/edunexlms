import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../helpers/test-users'

const validUser = TEST_USERS.admin

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('redirects to /dashboard on valid credentials', async ({ page }) => {
    await page.locator('#email').fill(validUser.email)
    await page.locator('#password').fill(validUser.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('shows error message on invalid credentials', async ({ page }) => {
    await page.locator('#email').fill('nonexistent@example.com')
    await page.locator('#password').fill('WrongPassword999!')
    await page.getByRole('button', { name: 'Sign in' }).click()

    const errorDiv = page.locator('div.text-destructive')
    await expect(errorDiv).toBeVisible({ timeout: 10_000 })
    await expect(errorDiv).not.toBeEmpty()
  })

  test('respects ?redirect= query param after login', async ({ page }) => {
    await page.goto('/login?redirect=/courses')

    await page.locator('#email').fill(validUser.email)
    await page.locator('#password').fill(validUser.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL('**/courses', { timeout: 15_000 })
    expect(page.url()).toContain('/courses')
  })

  test('shows "Signing in..." loading state and disables inputs', async ({
    page,
  }) => {
    await page.locator('#email').fill(validUser.email)
    await page.locator('#password').fill(validUser.password)

    const signInButton = page.getByRole('button', { name: 'Sign in' })
    await signInButton.click()

    // The button text should change to the loading state
    await expect(
      page.getByRole('button', { name: 'Signing in...' })
    ).toBeVisible()

    // Inputs should be disabled while loading
    await expect(page.locator('#email')).toBeDisabled()
    await expect(page.locator('#password')).toBeDisabled()

    // Eventually navigates to dashboard (confirming the full flow completes)
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
  })
})
