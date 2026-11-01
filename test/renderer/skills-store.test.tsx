import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource, type ProjectSnapshot } from '../../src/renderer/src/shared/api'
import {
  createWorkbenchStore,
  useWorkbench,
  WorkbenchProvider,
} from '../../src/renderer/src/entities/feature'

it('ignores skill refresh responses that finish out of order', async () => {
  const source = createMockSource({ locale: 'en' })
  const pending: Record<string, (skills: ProjectSnapshot['skills']) => void> = {}
  const store = createWorkbenchStore({
    ...source,
    scanSkills: (root) =>
      new Promise((resolve) => {
        pending[root] = resolve
      }),
  })
  await store.getState().openProject('dev')
  const { result } = renderHook(() => useWorkbench((state) => state.snapshot?.skills), {
    wrapper: ({ children }) => <WorkbenchProvider store={store}>{children}</WorkbenchProvider>,
  })
  const old = store.getState().refreshSkills('/old')
  const latest = store.getState().refreshSkills('/latest')
  const skill = { id: 'library:skill:latest', name: 'Latest', scope: 'global' as const }
  await act(async () => {
    pending['/latest']([skill])
    await latest
  })
  await act(async () => {
    pending['/old']([{ ...skill, id: 'library:skill:old' }])
    await old
  })
  expect(result.current?.filter((item) => item.id.startsWith('library:skill:'))).toEqual([skill])
})

it('preserves the loadProject skill scope when refreshing another project', async () => {
  const source = createMockSource({
    locale: 'en',
    loadSkills: async () => [{ id: 'external', name: 'External', markdown: '# Skill' }],
  })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('nandomoreira.dev')
  const { result } = renderHook(() => useWorkbench((state) => state.snapshot?.skills), {
    wrapper: ({ children }) => <WorkbenchProvider store={store}>{children}</WorkbenchProvider>,
  })
  const original = result.current
  await act(() => store.getState().refreshSkills('/skills'))
  expect(result.current).toEqual(original)
  expect(result.current?.some((item) => item.id.startsWith('library:skill:'))).toBe(false)
})
