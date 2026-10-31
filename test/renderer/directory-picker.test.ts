import { afterEach, expect, it, vi } from 'vitest'
import { selectProjectDirectory } from '../../src/renderer/src/shared/lib/directory-picker'
afterEach(() => {
  vi.unstubAllGlobals()
})
it('uses the restricted desktop bridge when available', async () => {
  const selectDirectory = vi.fn().mockResolvedValue({
    status: 'selected',
    id: '/projects/app',
    name: 'app',
    path: '/projects/app',
  })
  vi.stubGlobal('window', { forja: { selectDirectory } })
  expect(await selectProjectDirectory()).toEqual({
    status: 'selected',
    id: '/projects/app',
    name: 'app',
    path: '/projects/app',
  })
  expect(selectDirectory).toHaveBeenCalledOnce()
  expect(selectDirectory).toHaveBeenCalledWith()
})
it('opens a read-only browser directory picker and treats cancellation quietly', async () => {
  const handle = { name: 'web-app', kind: 'directory', isSameEntry: async () => false }
  const choose = vi.fn().mockResolvedValue(handle)
  vi.stubGlobal('window', { showDirectoryPicker: choose })
  const first = await selectProjectDirectory()
  expect(first).toMatchObject({ status: 'selected', name: 'web-app', path: 'web-app' })
  expect(choose).toHaveBeenCalledWith({ mode: 'read' })
  choose.mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'))
  expect(await selectProjectDirectory()).toEqual({ status: 'cancelled' })
})
it('returns safe results for unavailable, malformed and rejected pickers', async () => {
  vi.stubGlobal('window', {})
  expect(await selectProjectDirectory()).toEqual({ status: 'unavailable' })
  vi.stubGlobal('window', {
    forja: { selectDirectory: async () => ({ status: 'selected', path: 42 }) },
  })
  expect(await selectProjectDirectory()).toEqual({ status: 'error' })
  vi.stubGlobal('window', {
    forja: {
      selectDirectory: async () => {
        throw new Error('Private details')
      },
    },
  })
  expect(await selectProjectDirectory()).toEqual({ status: 'error' })
})

it('reuses the same browser directory while distinguishing folders with identical names', async () => {
  const handle = { name: 'same-name', kind: 'directory', isSameEntry: async () => false }
  const choose = vi.fn().mockResolvedValue(handle)
  vi.stubGlobal('window', { showDirectoryPicker: choose })
  const first = await selectProjectDirectory()
  expect(await selectProjectDirectory()).toEqual(first)
  choose.mockResolvedValueOnce({ ...handle })
  const other = await selectProjectDirectory()
  expect(other).not.toEqual(first)
  expect(other).toMatchObject({ status: 'selected', name: 'same-name' })
})
