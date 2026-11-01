// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'

afterEach(() => vi.useRealTimers())

it('records the model, duration and token usage when a reply completes', async () => {
  vi.useFakeTimers({ now: new Date(2026, 10, 1, 2, 36) })
  const source = createMockSource({ locale: 'en' })
  const settings = await source.loadSettings()
  await source.saveSettings({
    ...settings,
    agents: settings.agents.map((agent) => ({ ...agent, model: 'Sonnet' })),
  })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  store.getState().sendMessage('feature-1', 'Check the callback')
  const id = store.getState().snapshot!.features[0].messages.at(-1)!.id
  expect(store.getState().snapshot!.features[0].messages.at(-1)!.model).toBe('Sonnet')
  await vi.runAllTimersAsync()
  const reply = store.getState().snapshot!.features[0].messages.find((m) => m.id === id)!
  expect(reply.status).toBe('completed')
  expect(reply.durationMs).toBeGreaterThan(0)
  expect(reply.usage!.output).toBe(Math.ceil(reply.text.length / 4))
  expect(reply.usage!.input).toBeGreaterThan(Math.ceil('Check the callback'.length / 4))
  expect(reply.usage!.cached).toBe(0)
})
