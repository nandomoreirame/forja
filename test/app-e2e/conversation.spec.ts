import { expect, test } from '@playwright/test'

test('a prompt streams a reply and View request highlights the source message', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  const conversation = page.getByRole('list', { name: 'Conversation' })
  await page.getByRole('textbox', { name: /Send your prompt/ }).fill('Add the regression test')
  await page.keyboard.press('Control+Enter')
  await expect(
    conversation.getByRole('listitem').filter({ hasText: 'Add the regression test' }),
  ).toBeVisible()
  await expect(conversation).toContainText('What is the scope of this feature?')
  await page.getByRole('button', { name: 'View request' }).click()
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(1)
  await expect(page.locator('[data-highlighted="true"]')).toContainText(
    'Add OAuth login with clear error feedback.',
  )
  await expect(page.getByRole('textbox', { name: /Send your prompt/ })).toBeFocused()
})

test('terminals collapse to the footer toolbar and reopen the chosen tab', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  await page.getByRole('button', { name: 'Toggle terminals' }).click()
  await page.getByRole('tab', { name: /Implementer · tests/ }).click()
  await page.getByRole('button', { name: 'Collapse terminals' }).click()
  const toolbar = page.getByRole('toolbar', { name: 'Background terminals' })
  await toolbar.getByRole('button', { name: /Implementer · tests/ }).click()
  await expect(page.getByRole('tab', { name: /Implementer · tests/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('button', { name: 'New terminal' }).click()
  await expect(page.getByRole('tab', { name: /zsh/ })).toHaveAttribute('aria-selected', 'true')
})
