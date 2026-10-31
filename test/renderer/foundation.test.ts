// @vitest-environment node
import { expect, it } from 'vitest'
import config from '../../vite.web.config'
it('builds the browser renderer with Tailwind and the shared alias', () => {
  const plugins = (config.plugins ?? []).flat(3) as { name?: string }[]
  expect(plugins.some((plugin) => plugin?.name?.startsWith('@tailwindcss/vite'))).toBe(true)
  expect((config.resolve?.alias as Record<string, string>)['@']).toMatch(/\/src$/)
})
