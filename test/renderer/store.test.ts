// @vitest-environment node
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
it('starts on home', () => {
  expect(createWorkbenchStore(createMockSource({ locale: 'en' })).getState().view).toEqual({
    kind: 'home',
  })
})

it('loads projects, navigates history and toggles panels without duplicating views', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('acme-api')
  expect(store.getState().projects).toHaveLength(2)
  store.getState().back()
  expect(store.getState().historyIndex).toBe(0)
  store.getState().navigate({ kind: 'compose', role: 'research' })
  store.getState().navigate({ kind: 'compose', role: 'research' })
  expect(store.getState().history).toHaveLength(2)
  store.getState().back()
  expect(store.getState().view).toEqual({ kind: 'home' })
  store.getState().forward()
  store.getState().forward()
  expect(store.getState().view).toEqual({ kind: 'compose', role: 'research' })
  store.getState().back()
  store.getState().navigate({ kind: 'settings' })
  expect(store.getState().history).toHaveLength(2)
  store.getState().togglePanel('terminal')
  expect(store.getState().panels.terminal).toBe(true)
  await store.getState().openProject('dev')
  expect(store.getState().view).toEqual({ kind: 'conversation', featureId: 'feature-1' })
  expect(store.getState().history).toHaveLength(1)
})
it('ignores stale project loads and retains the last valid snapshot on errors', async () => {
  const source = createMockSource({ locale: 'en' })
  const pending: Record<
    string,
    (snapshot: Awaited<ReturnType<typeof source.loadProject>>) => void
  > = {}
  const store = createWorkbenchStore({
    ...source,
    loadProject: (id) =>
      new Promise((resolve) => {
        pending[id] = resolve
      }),
  })
  const first = store.getState().openProject('acme-api')
  const second = store.getState().openProject('dev')
  pending.dev(await source.loadProject('dev'))
  await second
  pending['acme-api'](await source.loadProject('acme-api'))
  await first
  expect(store.getState().snapshot?.project.id).toBe('dev')
})
