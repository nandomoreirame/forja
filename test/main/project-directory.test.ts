// @vitest-environment node
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  showOpenDialog: vi.fn(),
  fromWebContents: vi.fn(),
}))
vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle },
  dialog: { showOpenDialog: mocks.showOpenDialog },
  BrowserWindow: { fromWebContents: mocks.fromWebContents },
}))
import { registerProjectDirectoryPicker } from '../../src/main/project-directory'
import { selectDirectoryChannel } from '../../src/shared/desktop'
let root: string
const frame = {}
const owner = { isDestroyed: () => false }
const event = { sender: { mainFrame: frame }, senderFrame: frame }
beforeEach(async () => {
  vi.clearAllMocks()
  root = await mkdtemp(join(tmpdir(), 'forja-picker-'))
  mocks.fromWebContents.mockReturnValue(owner)
  registerProjectDirectoryPicker()
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})
const invoke = (...args: unknown[]) => mocks.handle.mock.calls[0][1](event, ...args)
it('opens a directory-only native dialog and returns the canonical selected path', async () => {
  mocks.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [root] })
  const path = await realpath(root)
  expect(await invoke()).toEqual({ status: 'selected', id: path, name: basename(path), path })
  expect(mocks.handle).toHaveBeenCalledWith(selectDirectoryChannel, expect.any(Function))
  expect(mocks.showOpenDialog).toHaveBeenCalledWith(owner, { properties: ['openDirectory'] })
})
it('rejects untrusted frames, unknown windows and renderer-supplied arguments', async () => {
  expect(await invoke('untrusted-path')).toEqual({ status: 'error' })
  const handler = mocks.handle.mock.calls[0][1]
  expect(await handler({ ...event, senderFrame: {} })).toEqual({ status: 'error' })
  mocks.fromWebContents.mockReturnValue(null)
  expect(await invoke()).toEqual({ status: 'error' })
  expect(mocks.showOpenDialog).not.toHaveBeenCalled()
})
it('handles cancellation, files, relative paths and dialog errors without leaking details', async () => {
  mocks.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] })
  expect(await invoke()).toEqual({ status: 'cancelled' })
  const file = join(root, 'file.txt')
  await writeFile(file, 'fixture')
  for (const path of [file, 'relative/path', join(root, 'missing')]) {
    mocks.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [path] })
    expect(await invoke()).toEqual({ status: 'error' })
  }
  mocks.showOpenDialog.mockRejectedValueOnce(new Error('Private system information'))
  expect(await invoke()).toEqual({ status: 'error' })
})
