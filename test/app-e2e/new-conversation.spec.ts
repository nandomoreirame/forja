import { expect, test } from '@playwright/test'
test('starts a focused conversation, creates a feature and closes its last tab', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /nandomoreira.dev/ }).click()
  await page
    .getByRole('main')
    .getByRole('button', { name: /New chat/ })
    .click()
  await expect(page.getByRole('textbox')).toBeFocused()
  await expect(page.getByRole('combobox', { name: 'Recipient' })).toHaveText('Research')
  await page.keyboard.type('Add OAuth login')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('tab', { name: /Add OAuth login/ })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Conversation' })).toContainText('Add OAuth login')
  // Closing never asks: a running agent keeps going in the background.
  await page.getByRole('button', { name: 'Close Add OAuth login' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // With every tab closed the editor shows the initial empty state again.
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)
})
test('opens a focused Research composer from the command bar', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /nandomoreira.dev/ }).click()
  await page.keyboard.press('Control+Shift+P')
  await page.getByRole('combobox').fill('New chat')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox')).toBeFocused()
  await expect(page.getByRole('combobox', { name: 'Recipient' })).toHaveText('Research')
})

test('Ctrl+R in the prompt preserves the draft without reloading', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /nandomoreira.dev/ }).click()
  await page
    .getByRole('main')
    .getByRole('button', { name: /New chat/ })
    .click()
  await page.getByRole('textbox').fill('Keep this draft')
  await page.keyboard.press('Control+r')
  await expect(page.getByRole('dialog', { name: 'Recent projects' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('textbox')).toHaveValue('Keep this draft')
  await expect(page.getByRole('complementary', { name: 'nandomoreira.dev' })).toBeVisible()
})
