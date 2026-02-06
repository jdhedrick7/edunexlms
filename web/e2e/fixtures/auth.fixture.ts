import { test as base, type Page } from '@playwright/test'
import path from 'path'

const authDir = path.resolve(__dirname, '../.auth')

type RoleFixtures = {
  adminPage: Page
  teacherPage: Page
  taPage: Page
  studentPage: Page
  student2Page: Page
}

export const test = base.extend<RoleFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(authDir, 'admin.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  teacherPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(authDir, 'teacher.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  taPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(authDir, 'ta.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  studentPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(authDir, 'student.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  student2Page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(authDir, 'student2.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
