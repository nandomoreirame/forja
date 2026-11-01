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
  await store.getState().openProject('nandomoreira.dev')
  expect(store.getState().projects).toHaveLength(6)
  store.getState().back()
  expect(store.getState().historyIndex).toBe(0)
  store.getState().navigate({ kind: 'compose', role: 'research', id: 'compose-1' })
  store.getState().navigate({ kind: 'compose', role: 'research', id: 'compose-1' })
  expect(store.getState().history).toHaveLength(2)
  store.getState().back()
  expect(store.getState().view).toEqual({ kind: 'home' })
  store.getState().forward()
  store.getState().forward()
  expect(store.getState().view).toEqual({ kind: 'compose', role: 'research', id: 'compose-1' })
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
  const first = store.getState().openProject('nandomoreira.dev')
  const second = store.getState().openProject('dev')
  pending.dev(await source.loadProject('dev'))
  await second
  pending['nandomoreira.dev'](await source.loadProject('nandomoreira.dev'))
  await first
  expect(store.getState().snapshot?.project.id).toBe('dev')
})

it('retains the loaded project and exposes errors when a subsequent load fails', async () => {
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  await store.getState().openProject('missing')
  expect(store.getState().snapshot?.project.id).toBe('dev')
  expect(store.getState().loading).toBe(false)
  expect(store.getState().error).toBe('Unable to load project')
})

it('retries the actual failed project request instead of a hardcoded project', async () => {
  const source = createMockSource({ locale: 'en' })
  let failed = true
  const store = createWorkbenchStore({
    ...source,
    loadProject: async (id) => {
      if (failed) throw new Error('Temporary failure')
      return source.loadProject(id)
    },
  })
  await store.getState().openProject('dev')
  expect(store.getState().snapshot).toBeNull()
  failed = false
  await store.getState().retryLoad()
  expect(store.getState().snapshot?.project.id).toBe('dev')
  expect(store.getState().error).toBeNull()
})
