// @vitest-environment node
import { expect, it } from 'vitest'
import { outputRoutes, withPageMetadata } from '../../site/scripts/prerender'

const template =
  '<!doctype html><html lang="en"><head><meta name="description" content="x" /></head><body><div id="root"></div></body></html>'

it('declares exactly the four bilingual pages', () => {
  expect(outputRoutes.map((x) => x.pathname)).toEqual([
    '/',
    '/pt-br',
    '/styleguide',
    '/pt-br/styleguide',
  ])
  expect(outputRoutes.find((x) => x.pathname === '/pt-br')?.lang).toBe('pt-BR')
})

it('sets locale metadata and keeps gallery routes out of search indexes', () => {
  const pt = withPageMetadata(template, outputRoutes[3], '<main>body</main>')
  expect(pt).toContain('<html lang="pt-BR"')
  expect(pt).toContain('<div id="root"><main>body</main></div>')
  expect(pt).toContain('name="robots" content="noindex"')
  expect(withPageMetadata(template, outputRoutes[0], '')).not.toContain('noindex')
})

it('is deterministic for identical input', () => {
  const first = withPageMetadata(template, outputRoutes[2], '<main>a</main>')
  expect(withPageMetadata(template, outputRoutes[2], '<main>a</main>')).toBe(first)
})
