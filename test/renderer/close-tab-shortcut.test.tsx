import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'

beforeEach(() => localStorage.clear())

const ctrlW = (target: Element | Window = window) =>
  fireEvent.keyDown(target, { key: 'w', ctrlKey: true })

it('closes the active tab with Ctrl+W, even from the composer', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  const before = screen.getAllByRole('tab').length
  ctrlW()
  expect(screen.queryByRole('tab', { name: /Login with OAuth/ })).toBeNull()
  expect(screen.getAllByRole('tab')).toHaveLength(before - 1)
  ctrlW(screen.getByRole('textbox', { name: /Send your prompt/ }))
  expect(screen.getAllByRole('tab')).toHaveLength(before - 2)
})

it('closes page tabs with Ctrl+W', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Archived' }))
  expect(screen.getByRole('tab', { name: /Archived/ })).toBeInTheDocument()
  ctrlW()
  expect(screen.queryByRole('tab', { name: /Archived/ })).toBeNull()
})

it('does nothing without tabs', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  for (const id of [...store.getState().openFeatureIds]) store.getState().closeFeature(id)
  const before = store.getState()
  store.getState().closeActiveTab()
  expect(store.getState().view).toEqual({ kind: 'home' })
  expect(store.getState().history).toBe(before.history)
})
