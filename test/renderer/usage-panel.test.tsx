import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

// AI usage lives in a topbar dropdown laid out like the AIBar: tool tabs and one card per window.
const openUsage = async (name = 'AI usage') => {
  const [header] = await screen.findAllByRole('banner')
  fireEvent.click(await within(header).findByRole('button', { name }))
  return screen.findByRole('dialog')
}

it('opens AI usage from a topbar button and keeps it out of the sidebar and rail', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(sidebar).queryByText('AI usage')).toBeNull()
  const trigger = within(screen.getAllByRole('banner')[0]).getByRole('button', { name: 'AI usage' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  const panel = await openUsage()
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  // Opening focuses the panel itself, so no action tooltip pops up on its own.
  expect(within(panel).getByRole('button', { name: 'Refresh' })).not.toHaveFocus()
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(within(panel).getByRole('heading', { name: 'AI usage' })).toBeInTheDocument()
  expect(within(panel).getByRole('tab', { name: 'Claude' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const session = await within(panel).findByRole('meter', { name: 'Session (5h)' })
  expect(within(session.closest('section')!).getByText(/resets in \d+h\d+m · /)).toBeVisible()
  expect(within(panel).getByRole('meter', { name: 'Weekly' })).toBeInTheDocument()
  expect(panel).toHaveTextContent('updated now')
  fireEvent.click(within(panel).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  // Reopening with data already loaded still focuses the panel, not its first action.
  const again = await openUsage()
  expect(within(again).getByRole('button', { name: 'Refresh' })).not.toHaveFocus()
  expect(again).toHaveFocus()
  fireEvent.keyDown(again, { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: /Collapse.*sidebar/i }))
  const rail = await screen.findByRole('navigation', { name: 'Sidebar sections' })
  expect(within(rail).queryByRole('button', { name: 'AI usage' })).toBeNull()
})

it('formats the panel in Portuguese and shows tools without data as unavailable', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'pt-br' })} initialProjectId="dev" />)
  const panel = await openUsage('Uso de IA')
  const session = await within(panel).findByRole('meter', { name: 'Sessão (5h)' })
  expect(within(session.closest('section')!).getByText(/reinicia em \d+h\d+m · /)).toBeVisible()
  expect(panel).toHaveTextContent('atualizado agora')
  fireEvent.click(within(panel).getByRole('tab', { name: 'OpenCode' }))
  expect(within(panel).getByText('Uso indisponível para esta ferramenta')).toBeInTheDocument()
})

it('refreshes on demand and opens Settings from the panel', async () => {
  const source = createMockSource({ locale: 'en' })
  const load = vi.spyOn(source, 'loadUsage')
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const panel = await openUsage()
  await within(panel).findByRole('meter', { name: 'Session (5h)' })
  const before = load.mock.calls.length
  fireEvent.click(within(panel).getByRole('button', { name: 'Refresh' }))
  expect(load.mock.calls.length).toBe(before + 1)
  fireEvent.click(within(panel).getByRole('button', { name: 'Usage settings' }))
  expect(await screen.findByRole('tab', { name: /Settings/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

it('shows the panel unavailable when usage cannot load', async () => {
  const source = createMockSource({ locale: 'en' })
  source.loadUsage = async () => {
    throw new Error('offline')
  }
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const panel = await openUsage()
  expect(await within(panel).findByText('Usage unavailable')).toBeInTheDocument()
  expect(within(panel).queryByRole('meter')).toBeNull()
})
