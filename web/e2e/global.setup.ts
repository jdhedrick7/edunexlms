import { test as setup, type Browser } from '@playwright/test'
import { TEST_USERS } from './helpers/test-users'
import path from 'path'
import fs from 'fs'

const authDir = path.resolve(__dirname, '.auth')

setup('authenticate all test users', async ({ browser }) => {
  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // Login each user and save their browser state
  const roles = ['admin', 'teacher', 'ta', 'student', 'student2'] as const

  for (const role of roles) {
    const user = TEST_USERS[role]
    const storageStatePath = path.join(authDir, `${role}.json`)

    await loginAndSaveState(browser, user.email, user.password, storageStatePath)
    console.log(`Authenticated ${role} (${user.email})`)
  }
})

async function loginAndSaveState(
  browser: Browser,
  email: string,
  password: string,
  storageStatePath: string,
) {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })

  await context.storageState({ path: storageStatePath })
  await context.close()
}
