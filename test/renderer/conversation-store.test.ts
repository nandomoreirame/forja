// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource, type FeatureSnapshot } from '../../src/renderer/src/shared/api'
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
const streamed = (feature: FeatureSnapshot) =>
  feature.terminals.filter((terminal) => terminal.id === `${feature.id}-${terminal.agent}`)
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
    expect(streamed(feature)[0]?.state).toBe('running')
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
  expect(streamed(first)).toMatchObject([
    {
      id: 'feature-1-implementer',
      label: 'Implementer · dev',
      state: 'completed',
      output: '$ npm run dev\nMock development server ready.',
      kind: 'agent',
      agent: 'implementer',
      command: 'npm run dev',
    },
  ])
  expect(streamed(second)).toMatchObject([
    {
      id: 'feature-2-tester',
      label: 'Tester · tests',
      state: 'completed',
      output: '$ npm test\nMock check: 1 test passed.',
    },
  ])
  expect(first.terminals.find((t) => t.id === 'feature-1-implementer-dev')?.state).toBe('running')
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
  expect(streamed(feature)[0]).toMatchObject({
    output: streamed(partial)[0].output,
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
  const first = streamed(store.getState().snapshot!.features[0])[0]
  store.getState().sendMessage('feature-1', 'Again')
  vi.runAllTimers()
  const terminals = streamed(store.getState().snapshot!.features[0])
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
it('keeps a manually stopped agent terminal stopped while its reply keeps streaming', async () => {
  const store = await setup()
  store.getState().setRecipient('feature-1', 'implementer')
  store.getState().sendMessage('feature-1', 'Implement')
  vi.advanceTimersByTime(250)
  store.getState().stopTerminal('feature-1', 'feature-1-implementer')
  const stopped = streamed(store.getState().snapshot!.features[0])[0]
  vi.runAllTimers()
  const feature = store.getState().snapshot!.features[0]
  expect(streamed(feature)[0]).toMatchObject({ state: 'interrupted', output: stopped.output })
  expect(feature.messages.at(-1)?.status).toBe('completed')
})
it('creates manual shells as idle tabs in the feature directory', async () => {
  const store = await setup()
  store.getState().addShell('feature-1')
  const shell = store.getState().snapshot!.features[0].terminals.at(-1)!
  expect(shell).toMatchObject({ kind: 'shell', label: 'zsh', state: 'draft', cwd: '~/dev' })
  expect(store.getState().terminalTabs['feature-1']).toBe(shell.id)
})
it('streams a code block from the Implementer and a command run from the Tester', async () => {
  const store = await setup()
  store.getState().setRecipient('feature-1', 'implementer')
  store.getState().sendMessage('feature-1', 'Implement')
  store.getState().setRecipient('feature-2', 'tester')
  store.getState().sendMessage('feature-2', 'Test')
  vi.runAllTimers()
  const [first, second] = store.getState().snapshot!.features
  expect(first.messages.at(-1)?.text).toMatch(/```ts\n[\s\S]+```/)
  expect(second.messages.at(-1)?.parts).toEqual([
    expect.objectContaining({ kind: 'command', command: 'npm test', exitCode: 0 }),
  ])
})
it('seeds the first feature with markdown, code, a command run, a log and a screenshot', async () => {
  for (const locale of ['en', 'pt-br'] as const) {
    const snapshot = await createMockSource({ locale }).loadProject('dev')
    const messages = snapshot.features[0].messages
    expect(messages.some((m) => m.attachments?.some((a) => a.kind === 'image' && a.alt))).toBe(true)
    expect(messages.some((m) => /\|.+\|/.test(m.text))).toBe(true)
    expect(messages.some((m) => /- \[[ x]\]/.test(m.text))).toBe(true)
    expect(messages.some((m) => /^- (?!\[)/m.test(m.text))).toBe(true)
    expect(messages.some((m) => m.text.includes('```ts'))).toBe(true)
    const parts = messages.flatMap((m) => m.parts ?? [])
    expect(parts.map((p) => p.kind)).toEqual(expect.arrayContaining(['command', 'log']))
    expect(parts.some((p) => p.kind === 'command' && p.exitCode !== 0)).toBe(true)
  }
})
it('never reuses a shell id or name after closing a shell', async () => {
  const store = await setup()
  store.getState().addShell('feature-1')
  store.getState().addShell('feature-1')
  const first = store.getState().snapshot!.features[0].terminals.at(-2)!
  store.getState().closeTerminal('feature-1', first.id)
  store.getState().addShell('feature-1')
  const shells = store.getState().snapshot!.features[0].terminals.filter((t) => t.kind === 'shell')
  expect(new Set(shells.map((t) => t.id)).size).toBe(shells.length)
  expect(new Set(shells.map((t) => t.label)).size).toBe(shells.length)
})
it('names a shell tab after the shell that actually started', async () => {
  const store = await setup()
  store.getState().addShell('feature-1')
  store.getState().addShell('feature-1')
  const [first, second] = store.getState().snapshot!.features[0].terminals.slice(-2)
  store.getState().setTerminalShell('feature-1', first.id, 'fish')
  store.getState().setTerminalShell('feature-1', second.id, 'bash')
  const labels = store
    .getState()
    .snapshot!.features[0].terminals.slice(-2)
    .map((t) => t.label)
  expect(labels).toEqual(['fish', 'bash 2'])
})
it('numbers shells correctly when the feature slug itself contains "shell"', async () => {
  const store = await setup()
  const id = store.getState().createFeatureFromPrompt('Check the shell', 'research')
  store.getState().addShell(id)
  store.getState().addShell(id)
  store.getState().setTerminalShell(id, `${id}-shell-2`, 'zsh')
  const shells = store.getState().snapshot!.features.find((f) => f.id === id)!.terminals
  expect(shells.map((t) => t.id)).toEqual([`${id}-shell-1`, `${id}-shell-2`])
  expect(shells.map((t) => t.label)).toEqual(['zsh', 'zsh 2'])
  expect(store.getState().terminalTabs[id]).toBe(`${id}-shell-2`)
})
