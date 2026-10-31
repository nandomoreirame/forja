import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { resetPtyRuntime } from '../../src/renderer/src/features/terminal/pty-runtime'

const xterm = vi.hoisted(() => ({
  written: [] as string[],
  input: undefined as undefined | ((d: string) => void),
  pending: [] as Array<() => void>,
}))
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    loadAddon() {}
    open() {}
    focus() {}
    dispose() {}
    write(data: string, done?: () => void) {
      xterm.written.push(data)
      if (done) xterm.pending.push(done)
    }
    onData(listener: (data: string) => void) {
      xterm.input = listener
      return { dispose() {} }
    }
    onResize() {
      return { dispose() {} }
    }
  },
}))
vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: class {
    onContextLoss() {}
    dispose() {}
  },
}))
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}))

let emitData: (event: { id: string; data: string }) => void = () => {}
let emitExit: (event: { id: string; exitCode: number }) => void = () => {}
let emitProcess: (event: { id: string; name: string }) => void = () => {}
const api = {
  create: vi.fn(async () => ({
    status: 'started' as const,
    id: 'pty-1',
    shell: 'zsh',
    cwd: '/home/dev',
  })),
  write: vi.fn(),
  resize: vi.fn(),
  close: vi.fn(),
  onData: vi.fn((listener: typeof emitData) => {
    emitData = listener
    return () => {}
  }),
  onExit: vi.fn((listener: typeof emitExit) => {
    emitExit = listener
    return () => {}
  }),
  onProcess: vi.fn((listener: typeof emitProcess) => {
    emitProcess = listener
    return () => {}
  }),
}

beforeEach(() => {
  vi.clearAllMocks()
  xterm.written = []
  xterm.pending = []
  resetPtyRuntime()
  Object.assign(window, { forja: { selectDirectory: vi.fn(), terminal: api } })
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  } as never
})
afterEach(() => {
  delete (window as { forja?: unknown }).forja
})

it('starts a real shell in the feature directory for a new terminal and closes it with the tab', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  await waitFor(() => expect(api.create).toHaveBeenCalledWith({ cwd: '~/dev', cols: 80, rows: 24 }))
  expect(screen.getByRole('region', { name: 'Terminals' })).not.toHaveTextContent('~/dev $')
  act(() => emitData({ id: 'pty-1', data: 'prompt$ ' }))
  expect(xterm.written).toContain('prompt$ ')
  act(() => xterm.input?.('ls\r'))
  expect(api.write).toHaveBeenCalledWith('pty-1', 'ls\r')
  fireEvent.click(screen.getByRole('button', { name: 'Close zsh' }))
  expect(api.close).toHaveBeenCalledWith('pty-1')
})

it('closes the shell tab when the shell exits, for example after Ctrl+D', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  await waitFor(() => expect(api.create).toHaveBeenCalled())
  act(() => xterm.input?.('\x04'))
  expect(api.write).toHaveBeenCalledWith('pty-1', '\x04')
  act(() => emitExit({ id: 'pty-1', exitCode: 0 }))
  expect(screen.queryByRole('tab', { name: /zsh/ })).toBeNull()
  expect(screen.getByRole('tab', { name: /Implementer · tests/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(api.close).not.toHaveBeenCalled()
})

it('keeps a shell that failed to start visible as failed', async () => {
  api.create.mockResolvedValueOnce({ status: 'error' } as never)
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  await waitFor(() => expect(screen.getByRole('tab', { name: /zsh/ })).toHaveTextContent('Failed'))
})

it('does not send the terminal replies produced while replaying a tab back to the shell', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  await waitFor(() => expect(api.create).toHaveBeenCalled())
  act(() => emitData({ id: 'pty-1', data: '\x1b[c$ ' }))
  fireEvent.click(screen.getByRole('tab', { name: /Implementer · dev/ }))
  fireEvent.click(screen.getByRole('tab', { name: /zsh/ }))
  await waitFor(() => expect(xterm.pending.length).toBeGreaterThan(0))
  act(() => xterm.input?.('\x1b[?1;2c'))
  expect(api.write).not.toHaveBeenCalled()
  act(() => xterm.pending.splice(0).forEach((done) => done()))
  act(() => xterm.input?.('ls\r'))
  expect(api.write).toHaveBeenCalledWith('pty-1', 'ls\r')
})

it('titles the tab with the running command and shows Idle only at the prompt', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  await waitFor(() => expect(api.create).toHaveBeenCalled())
  expect(screen.getByRole('tab', { name: /zsh/ })).toHaveTextContent('Idle')
  act(() => emitProcess({ id: 'pty-1', name: 'btop' }))
  const running = screen.getByRole('tab', { name: /btop/ })
  expect(running).toHaveTextContent('Running')
  expect(running).not.toHaveTextContent('Idle')
  act(() => emitProcess({ id: 'pty-1', name: 'zsh' }))
  expect(screen.getByRole('tab', { name: /zsh/ })).toHaveTextContent('Idle')
})
