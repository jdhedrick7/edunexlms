import { test as teardown } from '@playwright/test'

teardown('cleanup test data', async () => {
  // Test data (institution, users, course) is left in place between runs
  // so that global.setup.ts can reuse them (idempotent).
  // Only ephemeral data created during individual test suites
  // is cleaned up in their respective afterAll hooks.
  //
  // To fully reset test data, delete the e2e-test-u institution
  // and e2e-* users from Supabase manually.
  console.log('Teardown complete. Persistent test data left in place.')
})
