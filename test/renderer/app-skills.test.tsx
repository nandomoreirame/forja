import { render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { WorkbenchSource } from '../../src/renderer/src/shared/api'
import { App } from '../../src/renderer/src/app/App'

let source: WorkbenchSource
vi.mock('../../src/renderer/src/pages/workbench', () => ({
  WorkbenchPage: (props: { source: WorkbenchSource }) => {
    source = props.source
    return null
  },
}))
afterEach(() => vi.unstubAllGlobals())

it.each(
  [
    null,
    {},
    [{ id: 1, name: 'Invalid', markdown: '# Invalid' }],
    [{ id: 'invalid', name: null, markdown: '# Invalid' }],
    [{ id: 'invalid', name: 'Invalid' }],
    [null],
    [{ id: 'valid', name: 'Valid', markdown: '# Valid' }, { id: 'invalid' }],
  ].map((payload) => ({ payload })),
)('ignores invalid skill payload $payload at the fetch boundary', async ({ payload }) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }))
  render(<App locale="en" />)
  const skills = await source.scanSkills('/skills')
  expect(skills.filter((item) => item.id.startsWith('library:skill:'))).toEqual([])
})

it('accepts a validated skills payload', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'valid', name: 'Valid', markdown: '# Valid' }],
    }),
  )
  render(<App locale="en" />)
  expect(await source.scanSkills('/skills')).toContainEqual({
    id: 'library:skill:valid',
    name: 'Valid',
    scope: 'global',
  })
  await expect(source.readArtifact('library:skill:valid')).resolves.toBe('# Valid')
})
