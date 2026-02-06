import { test as unauthTest, expect as unauthExpect } from '@playwright/test'
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture'

unauthTest.describe('Unauthenticated route protection', () => {
  unauthTest(
    'visiting /dashboard redirects to /login?redirect=/dashboard',
    async ({ page }) => {
      await page.goto('/dashboard')

      await page.waitForURL('**/login**', { timeout: 10_000 })
      const url = new URL(page.url())
      unauthExpect(url.pathname).toBe('/login')
      unauthExpect(url.searchParams.get('redirect')).toBe('/dashboard')
    }
  )

  unauthTest(
    'visiting /courses redirects to /login',
    async ({ page }) => {
      await page.goto('/courses')

      await page.waitForURL('**/login**', { timeout: 10_000 })
      const url = new URL(page.url())
      unauthExpect(url.pathname).toBe('/login')
      unauthExpect(url.searchParams.get('redirect')).toBe('/courses')
    }
  )

  unauthTest(
    'visiting /admin redirects to /login',
    async ({ page }) => {
      await page.goto('/admin')

      await page.waitForURL('**/login**', { timeout: 10_000 })
      const url = new URL(page.url())
      unauthExpect(url.pathname).toBe('/login')
      unauthExpect(url.searchParams.get('redirect')).toBe('/admin')
    }
  )

  unauthTest(
    'visiting /settings redirects to /login',
    async ({ page }) => {
      await page.goto('/settings')

      await page.waitForURL('**/login**', { timeout: 10_000 })
      const url = new URL(page.url())
      unauthExpect(url.pathname).toBe('/login')
      unauthExpect(url.searchParams.get('redirect')).toBe('/settings')
    }
  )

  unauthTest(
    'visiting /tutor redirects to /login',
    async ({ page }) => {
      await page.goto('/tutor')

      await page.waitForURL('**/login**', { timeout: 10_000 })
      const url = new URL(page.url())
      unauthExpect(url.pathname).toBe('/login')
      unauthExpect(url.searchParams.get('redirect')).toBe('/tutor')
    }
  )
})

authTest.describe('Authenticated route protection', () => {
  authTest(
    'authenticated user visiting /login redirects to /dashboard',
    async ({ adminPage }) => {
      await adminPage.goto('/login')

      await adminPage.waitForURL('**/dashboard', { timeout: 10_000 })
      authExpect(new URL(adminPage.url()).pathname).toBe('/dashboard')
    }
  )

  authTest(
    'authenticated user visiting /signup redirects to /dashboard',
    async ({ adminPage }) => {
      await adminPage.goto('/signup')

      await adminPage.waitForURL('**/dashboard', { timeout: 10_000 })
      authExpect(new URL(adminPage.url()).pathname).toBe('/dashboard')
    }
  )
})
