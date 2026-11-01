import { expect, test } from '@playwright/test'

test('the sidebar opens features, archives and restores them and remembers sections', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  const sidebar = page.getByRole('complementary', { name: 'dev' })
  await expect(sidebar.getByText('Agents', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close Catalog search' }).click()
  await expect(page.getByRole('tab', { name: /Catalog search/ })).toHaveCount(0)
  await sidebar.getByRole('button', { name: /^Catalog search ·/ }).click()
  await expect(page.getByRole('tab', { name: /Catalog search/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await sidebar.getByRole('button', { name: 'Archive Catalog search' }).click()
  await expect(sidebar.getByRole('button', { name: /^Catalog search ·/ })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: /Catalog search/ })).toHaveCount(0)
  await sidebar.getByRole('button', { name: 'Archived' }).click()
  await page.getByRole('button', { name: 'Restore Catalog search' }).click()
  await expect(sidebar.getByRole('button', { name: /^Catalog search ·/ })).toBeVisible()
  const plans = sidebar.getByRole('button', { name: /^Plans/ })
  await plans.click()
  await expect(plans).toHaveAttribute('aria-expanded', 'false')
  await page.reload()
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  await expect(sidebar.getByRole('button', { name: /^Plans/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})
