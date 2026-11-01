import { expect, test } from '@playwright/test'

// The dev server serves the real repository docs; excerpt review on feature documents is
// covered by test/renderer/excerpt-review.test.tsx with deterministic mock data.
test('a real sidebar spec opens as a slug-titled tab with rendered Markdown', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  const sidebar = page.getByRole('complementary', { name: 'dev' })
  await expect(sidebar.getByRole('button', { name: /^login-oauth\/SPEC.md/ })).toHaveCount(0)
  await sidebar.getByRole('button', { name: /^document-viewer-screen\/SPEC.md/ }).click()
  await expect(page.getByRole('tab', { name: /^document-viewer-screen\/SPEC.md/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('heading', { name: 'Spec: Document Viewer Tabs' })).toBeVisible()
  await expect(page.getByRole('table').first()).toBeVisible()
  await expect(page.getByText('Content exceeds the preview limit.')).toHaveCount(0)
})
