import { expect, test } from '@playwright/test'

test('opens Settings as its own tab and saving clears the dirty state', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+R')
  await page.getByRole('option', { name: /^dev / }).click()
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('tab', { name: /Settings/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: /Login with OAuth/ })).toBeVisible()
  const save = page.getByRole('button', { name: 'Save changes' })
  await expect(save).toBeDisabled()
  await page.getByRole('textbox', { name: 'Additional instructions' }).fill('Prefer small commits')
  await expect(save).toBeEnabled()
  await save.click()
  await expect(save).toBeDisabled()
  await page.getByRole('tab', { name: 'General' }).click()
  await expect(page.getByRole('tab', { name: /Settings/ })).toHaveAttribute('aria-selected', 'true')
})
