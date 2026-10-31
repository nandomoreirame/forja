import { expect, test } from '@playwright/test'

const landings = [
  ['/', 'en', 'Implementer'],
  ['/pt-br', 'pt-BR', 'Implementador'],
] as const

for (const [path, lang, agent] of landings) {
  test(`landing ${lang} keeps preview language aligned`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    await expect(page.getByTestId('product-preview')).toContainText(agent)
    await expect(
      page.getByRole('link', { name: /Follow development|Acompanhar desenvolvimento/ }).first(),
    ).toHaveAttribute('href', 'https://github.com/nandomoreirame/forja/tree/release/2.0')
  })
}

for (const path of ['/styleguide', '/pt-br/styleguide'] as const) {
  test(`gallery ${path} renders every group without horizontal overflow`, async ({ page }) => {
    await page.goto(path)
    for (const id of [
      'gallery-tokens',
      'gallery-primitives-section',
      'gallery-shell',
      'gallery-conversation',
      'gallery-documents',
      'gallery-terminals',
    ]) {
      await expect(page.locator(`[aria-labelledby="${id}"]`).first()).toBeVisible()
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

test('keyboard focus reaches the skip link first and the locale switch keeps the landing', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.getByRole('link', { name: 'Português (Brasil)' }).click()
  await expect(page).toHaveURL(/\/pt-br$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
})

test('the gallery is not promoted in the landing navigation', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Styleguide' }),
  ).toHaveCount(0)
})

test('styleguide visual baseline (desktop 1280)', async ({ page }) => {
  await page.goto('/styleguide')
  await expect(page.locator('[aria-labelledby="gallery-documents"]').first()).toHaveScreenshot(
    'styleguide-documents-en.png',
  )
})
