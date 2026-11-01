import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
import { overrideFlags } from '../../src/renderer/src/shared/lib/feature-flags'

afterEach(() => overrideFlags({}))

const openBacklog = async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Backlog' }))
}

const addDemand = (title: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Add demand' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: title } })
  fireEvent.click(screen.getByRole('button', { name: 'Save demand' }))
}

it('adds a demand and starts it only after confirmation', async () => {
  await openBacklog()
  expect(screen.getByRole('tab', { name: /Backlog/ })).toHaveAttribute('aria-selected', 'true')
  addDemand('Export reports')
  const row = screen.getByRole('listitem', { name: /Export reports/ })
  fireEvent.click(within(row).getByRole('button', { name: 'Start research' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  expect(screen.getByRole('tab', { name: /Export reports/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Miner')
  fireEvent.click(screen.getByRole('tab', { name: /Backlog/ }))
  expect(screen.queryByRole('listitem', { name: /Export reports/ })).toBeNull()
})

it('keeps the demand when the confirmation is cancelled', async () => {
  await openBacklog()
  addDemand('Audit log')
  const row = screen.getByRole('listitem', { name: /Audit log/ })
  fireEvent.click(within(row).getByRole('button', { name: 'Start research' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('listitem', { name: /Audit log/ })).toBeInTheDocument()
  expect(screen.queryByRole('tab', { name: /Audit log/ })).toBeNull()
})

it('lists demands newest first, edits and removes them, and refuses an empty title', async () => {
  await openBacklog()
  addDemand('First demand')
  addDemand('Second demand')
  const list = screen.getByRole('list', { name: 'Backlog' })
  const titles = within(list)
    .getAllByRole('listitem')
    .map((item) => item.getAttribute('aria-label'))
  expect(titles.indexOf('Second demand')).toBeLessThan(titles.indexOf('First demand'))

  fireEvent.click(screen.getByRole('button', { name: 'Add demand' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: '   ' } })
  expect(screen.getByRole('button', { name: 'Save demand' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

  const row = screen.getByRole('listitem', { name: /First demand/ })
  fireEvent.click(within(row).getByRole('button', { name: 'Edit First demand' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
    target: { value: 'Renamed demand' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save demand' }))
  expect(screen.getByRole('listitem', { name: /Renamed demand/ })).toBeInTheDocument()
  fireEvent.click(
    within(screen.getByRole('listitem', { name: /Renamed demand/ })).getByRole('button', {
      name: 'Remove Renamed demand',
    }),
  )
  expect(screen.queryByRole('listitem', { name: /Renamed demand/ })).toBeNull()
})

it('closes the Backlog tab with Ctrl+W', async () => {
  await openBacklog()
  fireEvent.keyDown(window, { key: 'w', ctrlKey: true })
  expect(screen.queryByRole('tab', { name: /Backlog/ })).toBeNull()
})

it('hides the Backlog entry and page while the flag is off', async () => {
  overrideFlags({ 'backlog-board': false })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(sidebar).queryByRole('button', { name: 'Backlog' })).toBeNull()
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  store.getState().openBacklog()
  expect(store.getState().backlogOpen).toBe(false)
  expect(store.getState().view.kind).not.toBe('backlog')
})
