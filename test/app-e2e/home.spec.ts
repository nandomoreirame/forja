import { expect, test } from '@playwright/test'
test('home shell and panel toggles work', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'FORJA' })).toBeVisible()
  await expect(page.getByRole('complementary')).toHaveCount(0)
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /nandomoreira.dev/ }).click()
  // Pane actions show on hover, as in VS Code.
  await page.getByRole('region', { name: /^Features/ }).hover()
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(page.getByRole('complementary', { name: 'nandomoreira.dev' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  await page.getByRole('button', { name: 'Toggle terminals' }).click()
  await expect(page.getByRole('button', { name: 'Toggle terminals' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('preserves Tailwind disabled button styling', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /nandomoreira.dev/ }).click()
  await page
    .getByRole('main')
    .getByRole('button', { name: /New chat/ })
    .click()
  const send = page.getByRole('button', { name: 'Send', exact: true })
  await expect(send).toBeDisabled()
  await expect(send).toHaveCSS('opacity', '0.5')
})
