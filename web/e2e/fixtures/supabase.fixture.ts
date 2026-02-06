import { test as authTest } from './auth.fixture'
import { createTestAdminClient } from '../helpers/supabase-admin'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseFixtures = {
  supabaseAdmin: SupabaseClient | null
}

export const test = authTest.extend<SupabaseFixtures>({
  supabaseAdmin: async ({}, use) => {
    const client = createTestAdminClient()
    await use(client)
  },
})

export { expect } from '@playwright/test'
