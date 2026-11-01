// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'

afterEach(() => vi.useRealTimers())

it('loads each agent tool with the project and refreshes it after settings are saved', async () => {
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  const settings = await source.loadSettings()
  expect(store.getState().agentTools).toEqual(
    Object.fromEntries(settings.agents.map((agent) => [agent.id, agent.tool])),
  )
  await source.saveSettings({
    ...settings,
    agents: settings.agents.map((agent) =>
      agent.id === 'tester' ? { ...agent, tool: 'grok' } : agent,
    ),
  })
  await store.getState().refreshAgentTools()
  expect(store.getState().agentTools.tester).toBe('grok')
})

it('keeps the previous mapping and project available when settings cannot load', async () => {
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  const previous = store.getState().agentTools
  source.loadSettings = async () => {
    throw new Error('Unavailable')
  }
  await store.getState().refreshAgentTools()
  expect(store.getState().agentTools).toEqual(previous)
  await store.getState().openProject('dev')
  expect(store.getState().agentTools).toEqual(previous)
  expect(store.getState().snapshot?.project.id).toBe('dev')
  expect(store.getState().error).toBeNull()
})

it('keeps the answering tool during streaming and uses new settings for later replies', async () => {
  vi.useFakeTimers()
  const source = createMockSource({ locale: 'en' })
  const store = createWorkbenchStore(source)
  await store.getState().openProject('dev')
  store.getState().setRecipient('feature-1', 'tester')
  const originalTool = store.getState().agentTools.tester
  store.getState().sendMessage('feature-1', 'Test')
  vi.advanceTimersByTime(200)
  expect(store.getState().snapshot!.features[0].messages.at(-1)?.tool).toBe(originalTool)
  const settings = await source.loadSettings()
  await source.saveSettings({
    ...settings,
    agents: settings.agents.map((agent) =>
      agent.id === 'tester' ? { ...agent, tool: 'grok' } : agent,
    ),
  })
  await store.getState().refreshAgentTools()
  vi.runAllTimers()
  expect(store.getState().snapshot!.features[0].messages.at(-1)).toMatchObject({
    tool: originalTool,
    status: 'completed',
  })
  store.getState().sendMessage('feature-1', 'Again', 'tester')
  vi.runAllTimers()
  expect(store.getState().snapshot!.features[0].messages.at(-1)?.tool).toBe('grok')
})

it('falls back to the feature tool when the answering role has no mapping', async () => {
  vi.useFakeTimers()
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  store.setState({ agentTools: {} })
  const feature = store.getState().snapshot!.features[0]
  store.getState().sendMessage(feature.id, 'Test')
  vi.runAllTimers()
  expect(store.getState().snapshot!.features[0].messages.at(-1)?.tool).toBe(feature.tool)
})
