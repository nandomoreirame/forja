import { expect, test } from '@playwright/test'

test('a sidebar spec opens as a tab and an excerpt goes to the composer', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  await page.getByRole('button', { name: /login-oauth\/SPEC.md/ }).click()
  await expect(page.getByRole('tab', { name: /SPEC.md/ })).toHaveAttribute('aria-selected', 'true')

  const excerpt = page.getByText(
    'Ensure deterministic expiration handling for the OAuth callback.',
    {
      exact: true,
    },
  )
  await excerpt.click({ clickCount: 3 })
  await page.getByRole('button', { name: 'Review with agent', exact: true }).click()

  const composer = page.getByRole('textbox', { name: /Send your prompt/ })
  await expect(composer).toHaveValue(
    'Review login-oauth/SPEC.md:\n> Ensure deterministic expiration handling for the OAuth callback.',
  )
  await expect(page.getByRole('combobox', { name: 'Recipient' })).toHaveText('Research')
  await expect(composer).toBeFocused()
})
