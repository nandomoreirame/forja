import { expect, test, type Locator, type Page } from '@playwright/test'

const openProject = async (page: Page) => {
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  await expect(page.getByRole('tab', { name: /Login with OAuth/ })).toBeVisible()
}
const height = async (locator: Locator) => Math.round((await locator.boundingBox())!.height)
const width = async (locator: Locator) => Math.round((await locator.boundingBox())!.width)
const dragBy = async (page: Page, handle: Locator, dx: number, dy: number) => {
  const box = (await handle.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 8 })
  await page.mouse.up()
}

test('the terminal panel keeps one height across tabs and resizes from its top edge', async ({
  page,
}) => {
  await page.goto('/')
  await openProject(page)
  await page.getByRole('button', { name: 'Toggle terminals' }).click()
  const panel = page.getByRole('region', { name: 'Terminals' })
  const initial = await height(panel)
  expect(initial).toBeGreaterThanOrEqual(295)
  expect(initial).toBeLessThanOrEqual(305)
  await panel.getByRole('tab', { name: /Implementer · tests/ }).click()
  expect(await height(panel)).toBe(initial)
  await page.getByRole('button', { name: 'New terminal' }).click()
  expect(await height(panel)).toBe(initial)
  await dragBy(page, page.getByRole('separator', { name: 'Resize terminal panel' }), 0, -100)
  expect(Math.abs((await height(panel)) - (initial + 100))).toBeLessThanOrEqual(2)
  await dragBy(page, page.getByRole('separator', { name: 'Resize terminal panel' }), 0, 2000)
  expect(Math.abs((await height(panel)) - 77)).toBeLessThanOrEqual(2)
})

test('the sidebar resizes within its limits, resets on double click and is remembered', async ({
  page,
}) => {
  await page.goto('/')
  await openProject(page)
  const sidebar = page.getByRole('complementary', { name: 'dev' })
  const separator = page.getByRole('separator', { name: 'Resize sidebar' })
  expect(Math.abs((await width(sidebar)) - 240)).toBeLessThanOrEqual(2)
  await dragBy(page, separator, 80, 0)
  expect(Math.abs((await width(sidebar)) - 320)).toBeLessThanOrEqual(2)
  await dragBy(page, separator, -1000, 0)
  expect(Math.abs((await width(sidebar)) - 170)).toBeLessThanOrEqual(2)
  await dragBy(page, separator, 1000, 0)
  expect(Math.abs((await width(sidebar)) - 480)).toBeLessThanOrEqual(2)
  await separator.dblclick()
  expect(Math.abs((await width(sidebar)) - 240)).toBeLessThanOrEqual(2)
  await dragBy(page, separator, 60, 0)
  await page.reload()
  await openProject(page)
  expect(
    Math.abs((await width(page.getByRole('complementary', { name: 'dev' }))) - 300),
  ).toBeLessThanOrEqual(2)
})

test('separators are keyboard accessible', async ({ page }) => {
  await page.goto('/')
  await openProject(page)
  const separator = page.getByRole('separator', { name: 'Resize sidebar' })
  await separator.focus()
  const before = Number(await separator.getAttribute('aria-valuenow'))
  await page.keyboard.press('ArrowRight')
  expect(Number(await separator.getAttribute('aria-valuenow'))).toBeGreaterThan(before)
})
