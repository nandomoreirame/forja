import { expect, test } from '@playwright/test'
test('selects recent projects by keyboard and restores focus after Escape', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('complementary')).toHaveCount(0)
  await page.keyboard.press('Control+r')
  await page.getByRole('combobox').fill('dev')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('complementary', { name: 'dev' })).toBeVisible()
  const opener = page.getByRole('button', { name: 'dev, switch project' })
  await opener.click()
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
  await page.keyboard.press('Control+r')
  await expect(page.getByRole('option', { name: /^Settings/ })).toHaveCount(0)
  await page.getByRole('combobox').fill('acme-api')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'FORJA' })).toBeVisible()
})
test('traps focus and closes on outside click', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: /Recent projects/ })
  await opener.click()
  await expect(page.getByRole('combobox')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('combobox')).toBeFocused()
  await page.mouse.click(10, 10)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('shows only commands in the command bar', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+Shift+P')
  await expect(page.getByRole('option', { name: /acme-api/ })).toHaveCount(0)
  await expect(page.getByRole('option', { name: /Recent projects/ })).toHaveCount(1)
  await expect(page.getByRole('option', { name: /Open project/ })).toBeVisible()
  await page.keyboard.press('Control+r')
  await expect(page.getByRole('dialog', { name: 'Recent projects' })).toBeVisible()
  await expect(page.getByRole('option', { name: /acme-api/ })).toBeVisible()
})
test('opens the browser directory picker from the action and shortcut', async ({ page }) => {
  await page.addInitScript(() => {
    let calls = 0
    Object.defineProperty(window, 'showDirectoryPicker', {
      value: async () => {
        calls++
        return {
          kind: 'directory',
          name: `selected-project-${calls}`,
          isSameEntry: async () => false,
        }
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Open project/ }).click()
  await expect(page.getByRole('complementary', { name: 'selected-project-1' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('Control+o')
  await expect(page.getByRole('complementary', { name: 'selected-project-2' })).toBeVisible()
})

test('opens Settings with Ctrl+comma and recent history from its command', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+Shift+p')
  await expect(page.getByRole('option', { name: /Settings/ })).toContainText('Ctrl+,')
  await expect(page.locator('[data-slot="command-input-wrapper"] svg')).toHaveCount(0)
  await page.getByRole('combobox').fill('Recent projects')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Recent projects' })).toBeVisible()
  await expect(page.getByRole('option', { name: /acme-api/ })).toBeVisible()
  await page.keyboard.press('Control+,')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('main')).toContainText('Settings')
})
