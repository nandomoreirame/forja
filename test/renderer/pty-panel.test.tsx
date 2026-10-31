import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { resetPtyRuntime } from '../../src/renderer/src/features/terminal/pty-runtime'

const xterm = vi.hoisted(() => ({
  written: [] as string[],
  input: undefined as undefined | ((d: string) => void),
}))
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    loadAddon() {}
    open() {}
    focus() {}
    dispose() {}
    write(data: string) {
      xterm.written.push(data)
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
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}))

let emitData: (event: { id: string; data: string }) => void = () => {}
let emitExit: (event: { id: string; exitCode: number }) => void = () => {}
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
}

beforeEach(() => {
  vi.clearAllMocks()
  xterm.written = []
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

it('marks the shell tab finished when the process exits', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  await waitFor(() => expect(api.create).toHaveBeenCalled())
  act(() => emitExit({ id: 'pty-1', exitCode: 0 }))
  expect(screen.getByRole('tab', { name: /zsh/ })).toHaveTextContent('Completed')
})
