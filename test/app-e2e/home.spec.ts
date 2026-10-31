import { expect, test } from '@playwright/test'
test('home shell, panel toggles and view history work', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'FORJA' })).toBeVisible()
  await expect(page.getByRole('complementary')).toHaveCount(0)
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /nandomoreira.dev/ }).click()
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(page.getByRole('complementary', { name: 'nandomoreira.dev' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  await page.getByRole('button', { name: 'Toggle terminals' }).click()
  await expect(page.getByRole('button', { name: 'Toggle terminals' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: /New conversation/ }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'FORJA' })).toBeVisible()
})

test('preserves Tailwind disabled button styling', async ({ page }) => {
  await page.goto('/')
  const back = page.getByRole('button', { name: 'Back', exact: true })
  await expect(back).toBeDisabled()
  await expect(back).toHaveCSS('opacity', '0.5')
})
