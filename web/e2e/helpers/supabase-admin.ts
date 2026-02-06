import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client for test verification.
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createTestAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
