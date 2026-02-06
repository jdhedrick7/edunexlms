import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

// Store original name so we can restore it after tests
let originalName: string | null = null

test.describe('Admin Institution Settings', () => {
  test.afterAll(async () => {
    // Restore the original institution name if we changed it
    if (originalName) {
      const { createTestAdminClient } = await import(
        '../helpers/supabase-admin'
      )
      const supabase = createTestAdminClient()

      if (supabase) {
        await supabase
          .from('institutions')
          .update({ name: originalName })
          .eq('id', testData.institutionId)
      }
    }
  })

  test('admin can navigate to /admin/settings and see institution name', async ({
    adminPage,
  }) => {
    await adminPage.goto('/admin/settings')

    // Verify page heading
    await expect(
      adminPage.getByRole('heading', { name: 'Institution Settings' })
    ).toBeVisible()

    // Verify subheading text
    await expect(
      adminPage.getByText("Manage your institution's branding and settings")
    ).toBeVisible()

    // Wait for loading to complete (the "Loading..." text should disappear)
    await expect(adminPage.getByText('Loading...')).not.toBeVisible({
      timeout: 15000,
    })

    // Verify the Branding card is visible
    await expect(
      adminPage.getByText('Branding', { exact: true })
    ).toBeVisible()

    // Verify the Institution Name label is visible
    await expect(adminPage.getByLabel('Institution Name')).toBeVisible()

    // The institution name input should have a value (populated from DB)
    const nameInput = adminPage.getByLabel('Institution Name')
    const nameValue = await nameInput.inputValue()
    expect(nameValue.length).toBeGreaterThan(0)

    // Store original name for restoration in afterAll
    originalName = nameValue

    // The "Save Name" button should be visible but disabled (no changes yet)
    const saveButton = adminPage.getByRole('button', { name: 'Save Name' })
    await expect(saveButton).toBeVisible()
    await expect(saveButton).toBeDisabled()
  })

  test('admin can update institution name and save', async ({
    adminPage,
    supabaseAdmin,
  }) => {
    await adminPage.goto('/admin/settings')

    // Wait for loading to complete
    await expect(adminPage.getByText('Loading...')).not.toBeVisible({
      timeout: 15000,
    })

    // Store the original name before changing it
    const nameInput = adminPage.getByLabel('Institution Name')
    const currentName = await nameInput.inputValue()
    originalName = currentName

    // Clear and type a new name
    const updatedName = `${currentName} Updated`
    await nameInput.clear()
    await nameInput.fill(updatedName)

    // The save button should now be enabled since the name changed
    const saveButton = adminPage.getByRole('button', { name: 'Save Name' })
    await expect(saveButton).toBeEnabled()

    // Click save
    await saveButton.click()

    // Wait for the success message
    await expect(
      adminPage.getByText('Institution name updated')
    ).toBeVisible({ timeout: 10000 })

    // DB verify: the institutions table has the updated name
    if (supabaseAdmin) {
      const { data: institution, error } = await supabaseAdmin
        .from('institutions')
        .select('name')
        .eq('id', testData.institutionId)
        .single()

      expect(error).toBeNull()
      expect(institution).not.toBeNull()
      expect(institution!.name).toBe(updatedName)
    }

    // Restore original name via the UI to keep tests idempotent
    await nameInput.clear()
    await nameInput.fill(currentName)
    await saveButton.click()

    // Wait for the success message again
    await expect(
      adminPage.getByText('Institution name updated')
    ).toBeVisible({ timeout: 10000 })

    // DB verify: name is restored
    if (supabaseAdmin) {
      const { data: restored, error: restoreError } = await supabaseAdmin
        .from('institutions')
        .select('name')
        .eq('id', testData.institutionId)
        .single()

      expect(restoreError).toBeNull()
      expect(restored!.name).toBe(currentName)
    }

    // Clear the originalName since we already restored it
    originalName = null
  })
})
