import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { createMockSource } from '../../src/renderer/src/shared/api'
afterEach(() => {
  delete window.forja
  vi.unstubAllGlobals()
})
it('opens the selected directory from the home action and Ctrl+O without showing history', async () => {
  const picker = vi.fn().mockResolvedValue({
    status: 'selected',
    id: '/projects/actual-app',
    name: 'actual-app',
    path: '/projects/actual-app',
  })
  vi.stubGlobal('forja', undefined)
  Object.defineProperty(window, 'forja', { configurable: true, value: { selectDirectory: picker } })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} />)
  fireEvent.click(screen.getByRole('button', { name: /Open project/ }))
  expect(await screen.findByRole('complementary', { name: 'actual-app' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^actual-app, switch project/ })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).toBeNull()
  picker.mockResolvedValueOnce({ status: 'cancelled' })
  fireEvent.keyDown(window, { key: 'o', ctrlKey: true })
  await waitFor(() => expect(picker).toHaveBeenCalledTimes(2))
  expect(screen.getByRole('complementary', { name: 'actual-app' })).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'r', ctrlKey: true })
  expect(screen.getByRole('option', { name: /actual-app/ })).toBeInTheDocument()
  delete window.forja
})
it('keeps the welcome screen when directory selection is cancelled', async () => {
  Object.defineProperty(window, 'forja', {
    configurable: true,
    value: { selectDirectory: vi.fn().mockResolvedValue({ status: 'cancelled' }) },
  })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} />)
  fireEvent.click(screen.getByRole('button', { name: /Open project/ }))
  await waitFor(() => expect(window.forja?.selectDirectory).toHaveBeenCalledOnce())
  expect(screen.queryAllByRole('complementary')).toHaveLength(0)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()
  delete window.forja
})
