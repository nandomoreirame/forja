// @vitest-environment node
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
it('creates immutable unique features with their selected recipient and first message', async () => {
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('acme-api')
  const before = store.getState().snapshot
  store.getState().startCompose('planner')
  expect(store.getState().view).toEqual({ kind: 'compose', role: 'planner' })
  const id = store.getState().createFeatureFromPrompt('Rate limit public endpoints', 'planner')
  expect(store.getState().view).toEqual({ kind: 'conversation', featureId: id })
  expect(store.getState().openFeatureIds).toEqual([id])
  expect(store.getState().recipients[id]).toBe('planner')
  const feature = store.getState().snapshot?.features.find((f) => f.id === id)
  expect(feature).toMatchObject({
    state: 'running',
    stage: 'planner',
    destination: '~/projects/acme-api',
    branch: 'feature/rate-limit-public-endpoints',
    messages: [{ role: 'user', text: 'Rate limit public endpoints' }],
  })
  expect(before?.features).toHaveLength(0)
  expect((await source.loadProject('acme-api')).features).toHaveLength(0)
  const second = store.getState().createFeatureFromPrompt('Rate limit public endpoints', 'research')
  expect(store.getState().snapshot?.features.find((f) => f.id === second)?.slug).toBe(
    'rate-limit-public-endpoints-2',
  )
  store.getState().selectFeature(id)
  expect(store.getState().view).toEqual({ kind: 'conversation', featureId: id })
  store.getState().closeFeature(id)
  expect(store.getState().view).toEqual({ kind: 'conversation', featureId: second })
  store.getState().closeFeature(second)
  expect(store.getState().view).toEqual({ kind: 'compose', role: 'research' })
  expect(store.getState().openFeatureIds).toHaveLength(0)
})
it('requires an open project and defaults new conversations to Research', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  expect(() => store.getState().createFeatureFromPrompt('Login', 'research')).toThrow(
    'No open project',
  )
  store.getState().startCompose()
  expect(store.getState().view).toEqual({ kind: 'home' })
  await store.getState().openProject('dev')
  expect(store.getState().openFeatureIds).toEqual(['feature-1', 'feature-2'])
  store.getState().startCompose()
  expect(store.getState().view).toEqual({ kind: 'compose', role: 'research' })
  expect(() => store.getState().createFeatureFromPrompt('  ', 'research')).toThrow('Empty prompt')
  store.getState().selectFeature('missing')
  expect(store.getState().view).toEqual({ kind: 'compose', role: 'research' })
})
