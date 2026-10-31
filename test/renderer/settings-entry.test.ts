// @vitest-environment node
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'

it('opens Settings with the requested tab and preserves the selected feature', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const featureId = store.getState().openFeatureIds[0]

  store.getState().openSettings({ tab: 'general' })

  expect(store.getState().view).toEqual({ kind: 'settings', tab: 'general' })
  expect(store.getState().openFeatureIds).toContain(featureId)
  expect(await store.getState().source.loadSettings()).toHaveProperty('general')
})
