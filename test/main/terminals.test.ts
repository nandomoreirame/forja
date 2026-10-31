// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  on: vi.fn(),
  fromWebContents: vi.fn(),
}))
vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, on: mocks.on },
  BrowserWindow: { fromWebContents: mocks.fromWebContents },
}))
import { registerTerminals } from '../../src/main/terminals'
import {
  terminalCloseChannel,
  terminalCreateChannel,
  terminalDataChannel,
  terminalExitChannel,
  terminalResizeChannel,
  terminalWriteChannel,
} from '../../src/shared/desktop'
import type { PtyService } from '../../src/core/terminals/pty-service'

const frame = {}
const listeners: Record<string, () => void> = {}
const sender = {
  id: 3,
  mainFrame: frame,
  isDestroyed: () => false,
  send: vi.fn(),
  once: (name: string, listener: () => void) => {
    listeners[name] = listener
  },
}
const event = { sender, senderFrame: frame }
const handler = (channel: string) =>
  [...mocks.handle.mock.calls, ...mocks.on.mock.calls].find(([name]) => name === channel)![1]

function fakeService() {
  return {
    create: vi.fn(async () => ({ status: 'started', id: 'p1', shell: 'zsh', cwd: '/tmp' })),
    write: vi.fn(() => true),
    resize: vi.fn(() => true),
    close: vi.fn(() => true),
    closeOwner: vi.fn(),
    closeAll: vi.fn(),
  } as unknown as PtyService & Record<string, ReturnType<typeof vi.fn>>
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fromWebContents.mockReturnValue({ isDestroyed: () => false })
})

it('creates sessions only for well-formed requests from the main frame of an app window', async () => {
  const service = fakeService()
  registerTerminals(() => service)
  const create = handler(terminalCreateChannel)
  expect(await create(event, { cwd: '/tmp', cols: 80, rows: 24 })).toMatchObject({
    status: 'started',
    id: 'p1',
  })
  expect(service.create).toHaveBeenCalledWith(3, { cwd: '/tmp', cols: 80, rows: 24 })
  expect(await create(event, { cwd: '/tmp', cols: '80', rows: 24 })).toEqual({ status: 'error' })
  expect(await create(event, { cwd: '/tmp', cols: 80, rows: 24, shell: '/bin/bash' })).toEqual({
    status: 'error',
  })
  expect(await create({ sender, senderFrame: {} }, { cwd: '/tmp', cols: 80, rows: 24 })).toEqual({
    status: 'error',
  })
  mocks.fromWebContents.mockReturnValue(null)
  expect(await create(event, { cwd: '/tmp', cols: 80, rows: 24 })).toEqual({ status: 'error' })
})

it('forwards write, resize and close with the sender as owner and ignores malformed payloads', () => {
  const service = fakeService()
  registerTerminals(() => service)
  handler(terminalWriteChannel)(event, { id: 'p1', data: 'ls\r' })
  handler(terminalWriteChannel)(event, { id: 'p1', data: 42 })
  handler(terminalResizeChannel)(event, { id: 'p1', cols: 100, rows: 30 })
  handler(terminalCloseChannel)(event, { id: 'p1' })
  handler(terminalCloseChannel)(event, 'p1')
  expect(service.write).toHaveBeenCalledTimes(1)
  expect(service.write).toHaveBeenCalledWith(3, 'p1', 'ls\r')
  expect(service.resize).toHaveBeenCalledWith(3, 'p1', 100, 30)
  expect(service.close).toHaveBeenCalledTimes(1)
})

it('sends output and exit to the owning window and closes its sessions when it goes away', async () => {
  let callbacks:
    | {
        onData(owner: number, id: string, data: string): void
        onExit(owner: number, id: string, code: number): void
      }
    | undefined
  const service = fakeService()
  registerTerminals((options) => {
    callbacks = options
    return service
  })
  await handler(terminalCreateChannel)(event, { cwd: '/tmp', cols: 80, rows: 24 })
  callbacks!.onData(3, 'p1', 'hello')
  callbacks!.onExit(3, 'p1', 0)
  expect(sender.send).toHaveBeenCalledWith(terminalDataChannel, { id: 'p1', data: 'hello' })
  expect(sender.send).toHaveBeenCalledWith(terminalExitChannel, { id: 'p1', exitCode: 0 })
  listeners.destroyed()
  expect(service.closeOwner).toHaveBeenCalledWith(3)
})
