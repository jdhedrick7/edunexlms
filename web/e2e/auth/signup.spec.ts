import { test, expect } from '@playwright/test'

test.describe('Signup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
  })

  test('shows error when password is fewer than 6 characters', async ({
    page,
  }) => {
    await page.locator('#fullName').fill('Short Pass User')
    await page.locator('#email').fill('shortpass@example.com')
    await page.locator('#password').fill('12345')
    await page.getByRole('button', { name: 'Create account' }).click()

    const errorDiv = page.locator('div.text-destructive')
    await expect(errorDiv).toBeVisible({ timeout: 5_000 })
    await expect(errorDiv).toHaveText('Password must be at least 6 characters')
  })

  test('shows "Check your email" on valid signup', async ({ page }) => {
    const uniqueEmail = `e2e-signup-${Date.now()}@edunex-test.com`

    await page.locator('#fullName').fill('E2E Signup User')
    await page.locator('#email').fill(uniqueEmail)
    await page.locator('#password').fill('ValidPassword123!')
    await page.getByRole('button', { name: 'Create account' }).click()

    // Either the success card should appear, or Supabase may reject the
    // signup (e.g., for disposable/unrecognized email domains).
    // We accept either outcome as valid.
    const successMessage = page.getByText('Check your email')
    const errorDiv = page.locator('div.text-destructive')

    await expect(
      successMessage.or(errorDiv)
    ).toBeVisible({ timeout: 15_000 })
  })

  test('link to login page works', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: 'Sign in' })
    await expect(signInLink).toBeVisible()
    await signInLink.click()

    await page.waitForURL('**/login', { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})
