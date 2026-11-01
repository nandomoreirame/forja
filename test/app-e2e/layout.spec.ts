import { expect, test, type Locator, type Page } from '@playwright/test'

// Each workbench part sits inside its panel with a 4 px gap on both sides.
const frameInset = 8

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
  // The 300 px panel holds a framed part inset by the 4 px gap on each side.
  expect(initial).toBeGreaterThanOrEqual(295 - frameInset)
  expect(initial).toBeLessThanOrEqual(305 - frameInset)
  await panel.getByRole('tab', { name: /Implementer · tests/ }).click()
  expect(await height(panel)).toBe(initial)
  await page.getByRole('button', { name: 'New terminal' }).click()
  expect(await height(panel)).toBe(initial)
  await dragBy(page, page.getByRole('separator', { name: 'Resize terminal panel' }), 0, -100)
  expect(Math.abs((await height(panel)) - (initial + 100))).toBeLessThanOrEqual(2)
  await page.getByRole('separator', { name: 'Resize terminal panel' }).focus()
  await page.keyboard.press('End')
  await expect(panel).toHaveCount(0)
})

test('the sidebar resizes within its limits, resets on double click and is remembered', async ({
  page,
}) => {
  await page.goto('/')
  await openProject(page)
  const sidebar = page.getByRole('complementary', { name: 'dev' })
  const separator = page.getByRole('separator', { name: 'Resize sidebar' })
  expect(Math.abs((await width(sidebar)) - (240 - frameInset))).toBeLessThanOrEqual(2)
  await dragBy(page, separator, 80, 0)
  expect(Math.abs((await width(sidebar)) - (320 - frameInset))).toBeLessThanOrEqual(2)
  await dragBy(page, separator, -1000, 0)
  expect(Math.abs((await width(sidebar)) - (170 - frameInset))).toBeLessThanOrEqual(2)
  await dragBy(page, separator, 1000, 0)
  expect(Math.abs((await width(sidebar)) - (480 - frameInset))).toBeLessThanOrEqual(2)
  await separator.dblclick()
  expect(Math.abs((await width(sidebar)) - (240 - frameInset))).toBeLessThanOrEqual(2)
  await dragBy(page, separator, 60, 0)
  await page.reload()
  await openProject(page)
  expect(
    Math.abs((await width(page.getByRole('complementary', { name: 'dev' }))) - (300 - frameInset)),
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

test('dragging the terminal panel past its minimum closes it and reopening restores the size', async ({
  page,
}) => {
  await page.goto('/')
  await openProject(page)
  await page.getByRole('button', { name: 'Toggle terminals' }).click()
  const panel = page.getByRole('region', { name: 'Terminals' })
  await dragBy(page, page.getByRole('separator', { name: 'Resize terminal panel' }), 0, -60)
  const sized = await height(panel)
  await dragBy(page, page.getByRole('separator', { name: 'Resize terminal panel' }), 0, 2000)
  await expect(panel).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Toggle terminals' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(page.getByRole('tab', { name: /Implementer · dev/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Toggle terminals' }).click()
  expect(
    Math.abs((await height(page.getByRole('region', { name: 'Terminals' }))) - sized),
  ).toBeLessThanOrEqual(2)
  await expect(page.getByRole('tab', { name: /Implementer · dev/ })).toBeVisible()
})

test('opening and closing the terminal panel keeps the composer draft', async ({ page }) => {
  await page.goto('/')
  await openProject(page)
  await page.getByRole('textbox', { name: /Send your prompt/ }).fill('Keep this draft')
  await page.getByRole('button', { name: 'Toggle terminals' }).click()
  await page.getByRole('button', { name: 'Toggle terminals' }).click()
  await expect(page.getByRole('textbox', { name: /Send your prompt/ })).toHaveValue(
    'Keep this draft',
  )
})

test('the prompt composer is 25% shorter than its original 192 px', async ({ page }) => {
  await page.goto('/')
  await openProject(page)
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('textbox', { name: /Send your prompt/ }) })
  expect(Math.abs((await height(form)) - 144)).toBeLessThanOrEqual(2)
})

test('the project panel resizes within its limits, resets on double click and is remembered', async ({
  page,
}) => {
  await page.goto('/')
  await openProject(page)
  const panel = page.getByRole('complementary', { name: 'Project' })
  const separator = page.getByRole('separator', { name: 'Resize project panel' })
  expect(Math.abs((await width(panel)) - (260 - frameInset))).toBeLessThanOrEqual(2)
  await dragBy(page, separator, -80, 0)
  expect(Math.abs((await width(panel)) - (340 - frameInset))).toBeLessThanOrEqual(2)
  await dragBy(page, separator, 1000, 0)
  expect(Math.abs((await width(panel)) - (200 - frameInset))).toBeLessThanOrEqual(2)
  await dragBy(page, separator, -1000, 0)
  expect(Math.abs((await width(panel)) - (480 - frameInset))).toBeLessThanOrEqual(2)
  await separator.dblclick()
  expect(Math.abs((await width(panel)) - (260 - frameInset))).toBeLessThanOrEqual(2)
  await dragBy(page, separator, -40, 0)
  await page.reload()
  await openProject(page)
  expect(
    Math.abs(
      (await width(page.getByRole('complementary', { name: 'Project' }))) - (300 - frameInset),
    ),
  ).toBeLessThanOrEqual(2)
})
