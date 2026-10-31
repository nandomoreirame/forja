// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function setup() {
  vi.useFakeTimers()
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  return store
}
it('interrupts a running reply before starting the next one', async () => {
  const store = await setup()
  const id = store.getState().openFeatureIds[0]
  store.getState().sendMessage(id, 'First')
  vi.advanceTimersByTime(200)
  store.getState().sendMessage(id, 'Second')
  vi.runAllTimers()
  const messages = store.getState().snapshot!.features[0].messages
  expect(messages.filter((m) => m.role !== 'user').at(-2)).toMatchObject({ status: 'interrupted' })
  expect(messages.at(-1)).toMatchObject({ status: 'completed' })
})
it('streams independent features without changing selection or recipients', async () => {
  const store = await setup()
  store.getState().setRecipient('feature-1', 'implementer')
  store.getState().setRecipient('feature-2', 'tester')
  const view = store.getState().view
  const recipients = store.getState().recipients
  store.getState().sendMessage('feature-1', 'Implement')
  store.getState().sendMessage('feature-2', 'Test')
  vi.advanceTimersByTime(250)
  for (const feature of store.getState().snapshot!.features) {
    expect(feature.state).toBe('running')
    expect(feature.messages.at(-1)?.text).not.toBe('')
    expect(feature.terminals[0]?.state).toBe('running')
  }
  vi.runAllTimers()
  const [first, second] = store.getState().snapshot!.features
  expect(first.messages.at(-1)).toMatchObject({
    role: 'agent',
    author: 'implementer',
    status: 'completed',
  })
  expect(second.messages.at(-1)).toMatchObject({
    role: 'agent',
    author: 'tester',
    status: 'completed',
  })
  expect(first.terminals).toEqual([
    {
      id: 'feature-1-implementer',
      label: 'Implementer · dev',
      state: 'completed',
      output: '$ npm run dev\nMock development server ready.',
    },
  ])
  expect(second.terminals).toEqual([
    {
      id: 'feature-2-tester',
      label: 'Tester · tests',
      state: 'completed',
      output: '$ npm test\nMock check: 1 test passed.',
    },
  ])
  expect(first.state).toBe('waiting')
  expect(second.state).toBe('waiting')
  expect(store.getState().view).toEqual(view)
  expect(store.getState().recipients).toEqual(recipients)
})
it('preserves partial output when explicitly interrupted and does nothing when idle', async () => {
  const store = await setup()
  const before = store.getState()
  store.getState().interrupt('feature-1')
  expect(store.getState()).toBe(before)
  store.getState().setRecipient('feature-1', 'tester')
  store.getState().sendMessage('feature-1', 'Test')
  vi.advanceTimersByTime(250)
  const partial = store.getState().snapshot!.features[0]
  store.getState().interrupt('feature-1')
  vi.runAllTimers()
  const feature = store.getState().snapshot!.features[0]
  expect(feature.state).toBe('interrupted')
  expect(feature.messages.at(-1)).toMatchObject({
    text: partial.messages.at(-1)!.text,
    status: 'interrupted',
  })
  expect(feature.terminals[0]).toMatchObject({
    output: partial.terminals[0].output,
    state: 'interrupted',
  })
})
it('answers the first prompt immediately with reduced motion', async () => {
  const store = await setup()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true })),
  )
  const id = store.getState().createFeatureFromPrompt('New work', 'research')
  const feature = store.getState().snapshot!.features.find((f) => f.id === id)!
  expect(feature.messages).toHaveLength(2)
  expect(feature.messages.at(-1)).toMatchObject({
    role: 'agent',
    author: 'research',
    status: 'completed',
  })
  expect(feature.state).toBe('waiting')
  expect(vi.getTimerCount()).toBe(0)
})

it('does not apply an old reply to a newly loaded project snapshot', async () => {
  const store = await setup()
  store.getState().sendMessage('feature-1', 'Old prompt')
  await store.getState().openProject('dev')
  const snapshot = store.getState().snapshot
  vi.runAllTimers()
  expect(store.getState().snapshot).toBe(snapshot)
})
it('reuses a localized terminal while preserving previous output', async () => {
  vi.useFakeTimers()
  const store = createWorkbenchStore(createMockSource({ locale: 'pt-br' }))
  await store.getState().openProject('dev')
  store.getState().setRecipient('feature-1', 'tester')
  store.getState().sendMessage('feature-1', 'Test')
  vi.runAllTimers()
  const first = store.getState().snapshot!.features[0].terminals[0]
  store.getState().sendMessage('feature-1', 'Again')
  vi.runAllTimers()
  const terminals = store.getState().snapshot!.features[0].terminals
  expect(terminals).toHaveLength(1)
  expect(terminals[0].label).toBe('Testador · tests')
  expect(terminals[0].output).toBe(`${first.output}\n${first.output}`)
})
it('ignores invalid sends and falls back to the feature stage', async () => {
  const store = await setup()
  const before = store.getState()
  store.getState().sendMessage('missing', 'Ignored')
  store.getState().sendMessage('feature-1', '   ')
  expect(store.getState()).toBe(before)
  store.setState({ recipients: {} })
  store.getState().sendMessage('feature-1', ' Hello ')
  const feature = store.getState().snapshot!.features[0]
  expect(feature.messages.at(-2)?.text).toBe('Hello')
  expect(feature.messages.at(-1)?.author).toBe(feature.stage)
  vi.runAllTimers()
})
