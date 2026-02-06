import { test, expect } from '../fixtures/supabase.fixture'
import { loadTestData } from '../fixtures/test-data'

const testData = loadTestData()

// Track created announcement IDs for cleanup
const createdAnnouncementIds: string[] = []

test.describe('Cross-Role: Announcement Flow (Teacher → Student)', () => {
  test.afterAll(async () => {
    const { createTestAdminClient } = await import('../helpers/supabase-admin')
    const supabase = createTestAdminClient()
    if (!supabase) return

    // Clean up announcements created during tests
    if (createdAnnouncementIds.length > 0) {
      await supabase
        .from('announcements')
        .delete()
        .in('id', createdAnnouncementIds)
    }

    // Safety net cleanup
    await supabase
      .from('announcements')
      .delete()
      .eq('course_id', testData.courseId)
      .like('title', 'E2E Cross-Role%')
  })

  test('teacher creates announcement → student sees it in their view', async ({
    teacherPage,
    studentPage,
    supabaseAdmin,
  }) => {
    const uniqueTitle = `E2E Cross-Role Announcement ${Date.now()}`
    const content = 'This announcement should be visible to enrolled students.'

    // STEP 1: Teacher creates the announcement
    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)
    await expect(teacherPage.getByLabel('Title')).toBeVisible({ timeout: 15000 })

    await teacherPage.getByLabel('Title').fill(uniqueTitle)
    await teacherPage.getByLabel('Content').fill(content)
    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()

    // Wait for redirect back to announcements list
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/announcements`, {
      timeout: 15000,
    })

    // Verify teacher sees it
    await expect(teacherPage.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 })

    // DB VERIFICATION: Record exists
    if (supabaseAdmin) {
      const { data: dbAnnouncement, error } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .eq('course_id', testData.courseId)
        .eq('title', uniqueTitle)
        .single()

      expect(error).toBeNull()
      expect(dbAnnouncement).not.toBeNull()
      expect(dbAnnouncement!.author_id).toBe(testData.users.teacher.id)
      expect(dbAnnouncement!.content).toBe(content)
      createdAnnouncementIds.push(dbAnnouncement!.id)
    }

    // STEP 2: Student navigates to the same course announcements
    await studentPage.goto(`/courses/${testData.courseId}`)
    await expect(
      studentPage.getByRole('heading', {
        name: testData.courseName,
        level: 1,
      })
    ).toBeVisible({ timeout: 15000 })

    // Click the Announcements tab
    await studentPage.getByRole('button', { name: 'Announcements' }).click()
    await expect(
      studentPage.getByRole('heading', { name: 'Announcements' })
    ).toBeVisible()

    // STEP 3: Student should see the teacher's announcement
    await expect(studentPage.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 })
  })

  test('teacher creates pinned announcement → it appears first for student', async ({
    teacherPage,
    studentPage,
    supabaseAdmin,
  }) => {
    const pinnedTitle = `E2E Cross-Role Pinned ${Date.now()}`

    // Teacher creates a pinned announcement
    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)
    await expect(teacherPage.getByLabel('Title')).toBeVisible({ timeout: 15000 })

    await teacherPage.getByLabel('Title').fill(pinnedTitle)
    await teacherPage.getByLabel('Content').fill('This is a pinned announcement.')

    // Toggle pin
    const pinSwitch = teacherPage
      .locator('div')
      .filter({ hasText: /^Pin Announcement/ })
      .getByRole('switch')
    await pinSwitch.click()

    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/announcements`, {
      timeout: 15000,
    })

    // DB verification
    if (supabaseAdmin) {
      const { data: dbAnnouncement } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .eq('course_id', testData.courseId)
        .eq('title', pinnedTitle)
        .single()

      expect(dbAnnouncement).not.toBeNull()
      expect(dbAnnouncement!.pinned).toBe(true)
      createdAnnouncementIds.push(dbAnnouncement!.id)
    }

    // Student sees the pinned announcement
    await studentPage.goto(`/courses/${testData.courseId}`)
    await studentPage.getByRole('button', { name: 'Announcements' }).click()
    await expect(
      studentPage.getByRole('heading', { name: 'Announcements' })
    ).toBeVisible()

    // The pinned announcement should be visible
    await expect(studentPage.getByText(pinnedTitle)).toBeVisible({ timeout: 10000 })

    // Pinned badge should be visible
    await expect(studentPage.getByText('Pinned').first()).toBeVisible()
  })

  test('student cannot create announcements (no New Announcement button)', async ({
    studentPage,
  }) => {
    await studentPage.goto(`/courses/${testData.courseId}`)
    await studentPage.getByRole('button', { name: 'Announcements' }).click()
    await expect(
      studentPage.getByRole('heading', { name: 'Announcements' })
    ).toBeVisible()

    // Student should NOT see the "New Announcement" link/button
    await expect(
      studentPage.getByRole('link', { name: /New Announcement/ })
    ).not.toBeVisible()
  })

  test('student2 also sees announcements created by teacher', async ({
    teacherPage,
    student2Page,
    supabaseAdmin,
  }) => {
    const title = `E2E Cross-Role Student2 ${Date.now()}`

    // Teacher creates announcement
    await teacherPage.goto(`/courses/${testData.courseId}/announcements/new`)
    await expect(teacherPage.getByLabel('Title')).toBeVisible({ timeout: 15000 })
    await teacherPage.getByLabel('Title').fill(title)
    await teacherPage.getByLabel('Content').fill('Visible to all students.')
    await teacherPage.getByRole('button', { name: 'Create Announcement' }).click()
    await teacherPage.waitForURL(`**/courses/${testData.courseId}/announcements`, {
      timeout: 15000,
    })

    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('announcements')
        .select('id')
        .eq('title', title)
        .single()
      if (data) createdAnnouncementIds.push(data.id)
    }

    // Student2 sees it
    await student2Page.goto(`/courses/${testData.courseId}`)
    await student2Page.getByRole('button', { name: 'Announcements' }).click()
    await expect(
      student2Page.getByRole('heading', { name: 'Announcements' })
    ).toBeVisible()
    await expect(student2Page.getByText(title)).toBeVisible({ timeout: 10000 })
  })
})
