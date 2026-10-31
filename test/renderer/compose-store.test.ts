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

it('appends follow-up prompts to the selected mock feature without changing fixtures', async () => {
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('acme-api')
  const id = store.getState().createFeatureFromPrompt('Login', 'research')
  store.getState().appendPrompt(id, 'Handle expiration', 'planner')
  expect(store.getState().snapshot?.features[0].messages).toHaveLength(2)
  expect(store.getState().recipients[id]).toBe('planner')
  store.getState().appendPrompt(id, '   ', 'planner')
  store.getState().appendPrompt('missing', 'Ignored', 'research')
  expect(store.getState().snapshot?.features[0].messages).toHaveLength(2)
  expect((await source.loadProject('acme-api')).features).toHaveLength(0)
})

it('keeps the history cursor and forward entries when an inactive feature closes', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  store.getState().navigate({ kind: 'settings' })
  store.getState().navigate({ kind: 'document', artifactId: 'spec' })
  store.getState().back()
  expect(store.getState().historyIndex).toBe(1)
  store.getState().closeFeature('feature-2')
  expect(store.getState().historyIndex).toBe(1)
  expect(store.getState().history).toHaveLength(3)
  store.getState().forward()
  expect(store.getState().view).toEqual({ kind: 'document', artifactId: 'spec' })
})
