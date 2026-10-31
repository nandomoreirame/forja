// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { createPtySessions } from '../../src/renderer/src/features/terminal/pty-sessions'
import type { DesktopTerminalApi } from '../../src/shared/desktop'

function fakeApi() {
  let data: (event: { id: string; data: string }) => void = () => {}
  let exit: (event: { id: string; exitCode: number }) => void = () => {}
  let proc: (event: { id: string; name: string }) => void = () => {}
  let next = 0
  const api = {
    create: vi.fn(async () => ({
      status: 'started' as const,
      id: `pty-${++next}`,
      shell: 'zsh',
      cwd: '/w',
    })),
    write: vi.fn(),
    resize: vi.fn(),
    close: vi.fn(),
    onData: vi.fn((listener) => {
      data = listener
      return () => {}
    }),
    onExit: vi.fn((listener) => {
      exit = listener
      return () => {}
    }),
    onProcess: vi.fn((listener) => {
      proc = listener
      return () => {}
    }),
  } satisfies DesktopTerminalApi
  return {
    api,
    emitData: (id: string, d: string) => data({ id, data: d }),
    emitExit: (id: string, c: number) => exit({ id, exitCode: c }),
    emitProcess: (id: string, name: string) => proc({ id, name }),
  }
}

it('starts one PTY per terminal, replays buffered output to a reattached view and routes input', async () => {
  const { api, emitData } = fakeApi()
  const sessions = createPtySessions(api, { onExit: vi.fn() })
  const first = vi.fn()
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, first)
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, first)
  expect(api.create).toHaveBeenCalledTimes(1)
  emitData('pty-1', 'hello ')
  expect(first).toHaveBeenLastCalledWith('hello ', false)
  sessions.detach('t1')
  emitData('pty-1', 'world')
  const second = vi.fn()
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, second)
  expect(second).toHaveBeenCalledWith('hello world', true)
  sessions.write('t1', 'ls\r')
  sessions.resize('t1', 120, 40)
  expect(api.write).toHaveBeenCalledWith('pty-1', 'ls\r')
  expect(api.resize).toHaveBeenCalledWith('pty-1', 120, 40)
})

it('reports exits, keeps the transcript bounded and closes the PTY on request', async () => {
  const { api, emitData, emitExit } = fakeApi()
  const onExit = vi.fn()
  const sessions = createPtySessions(api, { onExit, maxBuffer: 10 })
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, () => {})
  emitData('pty-1', '0123456789abcdef')
  const view = vi.fn()
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, view)
  expect(view).toHaveBeenCalledWith('6789abcdef', true)
  emitExit('pty-1', 130)
  expect(onExit).toHaveBeenCalledWith('f1', 't1', 130)
  sessions.close('t1')
  expect(api.close).not.toHaveBeenCalled()
  await sessions.attach('t2', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, () => {})
  sessions.close('t2')
  expect(api.close).toHaveBeenCalledWith('pty-2')
})

it('reports a failed start without retrying on every attach', async () => {
  const { api } = fakeApi()
  api.create.mockResolvedValueOnce({ status: 'error' } as never)
  const onExit = vi.fn()
  const sessions = createPtySessions(api, { onExit })
  const view = vi.fn()
  expect(
    await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, view),
  ).toBe(false)
  expect(
    await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, view),
  ).toBe(false)
  expect(api.create).toHaveBeenCalledTimes(1)
  expect(onExit).toHaveBeenCalledWith('f1', 't1', -1)
})

it('reports the started shell name so the tab can show it', async () => {
  const { api } = fakeApi()
  const onStart = vi.fn()
  const sessions = createPtySessions(api, { onExit: vi.fn(), onStart })
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, () => {})
  expect(onStart).toHaveBeenCalledWith('f1', 't1', 'zsh')
})

it('flags the replayed transcript so terminal replies to it are not sent to the shell', async () => {
  const { api, emitData } = fakeApi()
  const sessions = createPtySessions(api, { onExit: vi.fn() })
  const first = vi.fn()
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, first)
  emitData('pty-1', '\x1b[c prompt')
  expect(first).toHaveBeenLastCalledWith('\x1b[c prompt', false)
  const second = vi.fn()
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, second)
  expect(second).toHaveBeenCalledWith('\x1b[c prompt', true)
})

it('reports foreground process changes for the terminal that owns the PTY', async () => {
  const { api, emitProcess } = fakeApi()
  const onProcess = vi.fn()
  const sessions = createPtySessions(api, { onExit: vi.fn(), onProcess })
  await sessions.attach('t1', { featureId: 'f1', cwd: '/w', cols: 80, rows: 24 }, () => {})
  emitProcess('pty-1', 'claude')
  emitProcess('unknown', 'btop')
  expect(onProcess).toHaveBeenCalledTimes(1)
  expect(onProcess).toHaveBeenCalledWith('f1', 't1', 'claude')
})
