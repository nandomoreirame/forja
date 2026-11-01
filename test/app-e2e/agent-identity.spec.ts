import { expect, test } from '@playwright/test'

test('agent replies show mascots beside gray speech bubbles and the cycle shows tools', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  await page.getByRole('button', { name: 'Flow', exact: true }).click()
  const cycle = page.getByRole('list', { name: 'Cycle' })
  await expect(cycle.locator('[data-slot="tool-icon"]')).toHaveCount(5)
  const bubble = page.locator('[data-surface="reply"]').first()
  const row = page.getByRole('listitem').filter({ has: bubble }).first()
  await expect(row.locator('[data-slot="agent-mascot"]')).toBeVisible()
  await expect(bubble.locator('[data-slot="agent-mascot"]')).toHaveCount(0)
  const bg = await bubble.evaluate((el) => getComputedStyle(el).backgroundColor)
  const pageBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).not.toBe(pageBg)
  await page.getByRole('textbox', { name: /Send your prompt/ }).fill('Check the callback')
  await page.keyboard.press('Control+Enter')
  await expect(page.locator('svg[data-slot="agent-mascot"][data-speaking="true"]')).toHaveCount(1)
})
